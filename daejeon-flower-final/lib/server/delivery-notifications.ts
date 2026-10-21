import { Env, assert, body, json, token } from './types';
import { admin } from './auth';
import { deliveryLink } from './delivery-access';
import { deliveryPayload, sendingReady, solapiRequest, normalizePhone, deliveryChannel, deliveryTemplate, configuredOrigin, checkSolapiConnection } from './solapi';

// Called inside the same D1 batch as the order status update, before releasing its lock.
export function deliveryEventStatement(env: Env, orderId: number, operation: string) {
  return env.DB.prepare(`INSERT OR IGNORE INTO delivery_notification_outbox(id,event_key,order_id,recipient_phone,status)
    SELECT ?, 'DELIVERY_COMPLETE:' || o.id, o.id, o.orderer_phone, ? FROM orders o
    WHERE o.id=? AND o.status='DELIVERED' AND o.payment_status='PAID' AND o.kakao_updates_enabled=1
    AND EXISTS(SELECT 1 FROM order_versions v WHERE v.order_id=o.id AND v.operation_token=?)
    AND EXISTS(SELECT 1 FROM order_media om WHERE om.order_id=o.id AND om.kind='DELIVERY_COMPLETE')
    ON CONFLICT(event_key) DO UPDATE SET status=excluded.status,failure_code=NULL,expires_at=datetime('now','+7 days'),updated_at=CURRENT_TIMESTAMP
    WHERE delivery_notification_outbox.status='CANCELLED' AND delivery_notification_outbox.attempts<5`)
    .bind(token(), sendingReady(env) ? 'PENDING' : 'WAITING_SETUP', orderId, operation);
}

async function setState(env: Env, id: string, from: string, status: string, code: string | null = null) {
  await env.DB.prepare("UPDATE delivery_notification_outbox SET status=?,failure_code=?,updated_at=CURRENT_TIMESTAMP,sent_at=CASE WHEN ?='SENT' THEN CURRENT_TIMESTAMP ELSE sent_at END WHERE id=? AND status=?")
    .bind(status, code, status, id, from).run();
}

async function reconcile(env: Env) {
  const rows = await env.DB.prepare("SELECT id,provider_group_id FROM delivery_notification_outbox WHERE status='ACCEPTED' AND provider_group_id IS NOT NULL ORDER BY updated_at LIMIT 5").all<any>();
  for (const row of rows.results) {
    try {
      const response = await solapiRequest(env, '/messages/v4/groups/' + row.provider_group_id);
      if (!response.ok) continue;
      const data: any = await response.json();
      const counts = data.count;
      // Every request contains exactly one message; no aggregate guess for partial delivery.
      if (counts?.total !== 1 || counts?.sentPending > 0) continue;
      if (counts.sentSuccess === 1 && counts.sentFailed === 0) await setState(env, row.id, 'ACCEPTED', 'SENT');
      else if (counts.sentFailed === 1 && counts.sentSuccess === 0) await setState(env, row.id, 'ACCEPTED', 'FAILED', 'PROVIDER_DELIVERY_FAILED');
    } catch { /* Retrieval failures never re-send an already accepted message. */ }
  }
}

export async function runDeliveryJobs(env: Env) {
  if (!sendingReady(env)) return;
  await env.DB.prepare("UPDATE delivery_notification_outbox SET status='UNKNOWN',failure_code='INTERRUPTED_REQUEST',updated_at=CURRENT_TIMESTAMP WHERE status='SENDING' AND updated_at<datetime('now','-5 minutes')").run();
  await reconcile(env);
  const rows = await env.DB.prepare("SELECT * FROM delivery_notification_outbox WHERE status IN ('PENDING','WAITING_SETUP') AND attempts<5 ORDER BY created_at,id LIMIT 5").all<any>();
  for (const row of rows.results) {
    const order: any = await env.DB.prepare("SELECT o.*,EXISTS(SELECT 1 FROM order_media om WHERE om.order_id=o.id AND om.kind='DELIVERY_COMPLETE') AS has_photo FROM orders o WHERE id=?").bind(row.order_id).first();
    const current = row.status;
    if (!order || order.status !== 'DELIVERED' || order.payment_status !== 'PAID' || !order.kakao_updates_enabled || !order.has_photo || row.expires_at <= new Date().toISOString().replace('T',' ').slice(0,19)) {
      await setState(env, row.id, current, 'CANCELLED', 'ORDER_NO_LONGER_ELIGIBLE'); continue;
    }
    const phone = normalizePhone(row.recipient_phone);
    if (!phone || phone !== normalizePhone(order.orderer_phone)) { await setState(env, row.id, current, 'FAILED', 'INVALID_ORDERER_PHONE'); continue; }
    if (env.KAKAO_LIVE_SEND_ENABLED !== 'true' && phone !== normalizePhone(env.KAKAO_TEST_PHONE || '')) {
      await setState(env, row.id, current, 'WAITING_SETUP', 'TEST_RECIPIENT_ONLY'); continue;
    }
    const claimed = await env.DB.prepare("UPDATE delivery_notification_outbox SET status='SENDING',attempts=attempts+1,failure_code=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('PENDING','WAITING_SETUP') AND attempts<5").bind(row.id).run();
    if (claimed.meta.changes !== 1) continue;
    let payload: unknown;
    try { payload = deliveryPayload(env, phone, order.order_no, await deliveryLink(env, order), row.id); }
    catch { await setState(env, row.id, 'SENDING', 'FAILED', 'PHOTO_LINK_CONFIGURATION'); continue; }
    try {
      const response = await solapiRequest(env, '/messages/v4/send-many/detail', payload);
      if (!response.ok) {
        await setState(env, row.id, 'SENDING', response.status >= 400 && response.status < 500 ? 'FAILED' : 'UNKNOWN', `PROVIDER_HTTP_${response.status}`); continue;
      }
      const result: any = await response.json();
      const group = result.groupInfo?.groupId, message = result.messageList?.[0]?.messageId;
      if (result.failedMessageList?.length || result.groupInfo?.count?.registeredFailed === 1) {
        await setState(env, row.id, 'SENDING', 'FAILED', 'PROVIDER_REJECTED'); continue;
      }
      if (typeof group !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(group) || result.groupInfo?.count?.registeredSuccess !== 1) {
        await setState(env, row.id, 'SENDING', 'UNKNOWN', 'UNCONFIRMED_RESPONSE'); continue;
      }
      await env.DB.prepare("UPDATE delivery_notification_outbox SET status='ACCEPTED',provider_group_id=?,provider_message_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='SENDING'")
        .bind(group, typeof message === 'string' ? message.slice(0,100) : null, row.id).run();
    } catch { await setState(env, row.id, 'SENDING', 'UNKNOWN', 'NETWORK_RESULT_UNKNOWN'); }
  }
}

export async function deliveryNotificationsApi(req: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/admin/delivery-notifications')) return null;
  const user = await admin(req, env, ['OWNER','MANAGER']);
  if (path === '/admin/delivery-notifications/connection-check' && req.method === 'POST') {
    return json(await checkSolapiConnection(env));
  }
  if (path === '/admin/delivery-notifications' && req.method === 'GET') {
    const page = Math.max(1, Math.min(100000, Math.floor(Number(new URL(req.url).searchParams.get('page')) || 1)));
    const rows = await env.DB.prepare('SELECT n.id,n.status,n.attempts,n.failure_code,n.created_at,n.updated_at,n.sent_at,n.recipient_phone,o.order_no FROM delivery_notification_outbox n JOIN orders o ON o.id=n.order_id ORDER BY n.created_at DESC,n.id DESC LIMIT 25 OFFSET ?').bind((page-1)*25).all<any>();
    const count: any = await env.DB.prepare('SELECT COUNT(*) AS total FROM delivery_notification_outbox').first();
    return json({page, total: count.total, config: {ready: sendingReady(env), enabled: env.KAKAO_SENDING_ENABLED === 'true', liveSend: env.KAKAO_LIVE_SEND_ENABLED === 'true', testPhoneConfigured: !!normalizePhone(env.KAKAO_TEST_PHONE || ''), originConfigured: !!configuredOrigin(env), keyConfigured: !!env.SOLAPI_API_KEY, secretConfigured: !!env.SOLAPI_API_SECRET, templateId: env.SOLAPI_DELIVERY_TEMPLATE_ID || deliveryTemplate, channelId: env.SOLAPI_CHANNEL_ID || deliveryChannel},
      rows: rows.results.map(r => ({...r, recipient_phone: '끝자리 ' + normalizePhone(r.recipient_phone).slice(-4)}))});
  }
  const match = path.match(/^\/admin\/delivery-notifications\/([a-f0-9]{64})\/retry$/);
  if (match && req.method === 'POST') {
    const data = await body(req, 1024);
    assert(data.confirm === true, 400, '재시도 여부를 확인해주세요.');
    const row: any = await env.DB.prepare('SELECT * FROM delivery_notification_outbox WHERE id=?').bind(match[1]).first();
    assert(row && ['FAILED','WAITING_SETUP'].includes(row.status) && row.attempts < 5, 409, '재시도할 수 없는 상태입니다. 발송 내역을 확인해주세요.');
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE delivery_notification_outbox SET status='PENDING',failure_code=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('FAILED','WAITING_SETUP') AND attempts<5").bind(row.id),
      env.DB.prepare("INSERT INTO admin_activity(admin_user_id,action,target_type,target_id) VALUES(?,'배송완료 카카오 알림 재시도','delivery_notification',?)").bind(user.id, row.id)
    ]);
    assert(results[0].meta.changes === 1, 409, '알림 상태가 변경되었습니다. 다시 확인해주세요.');
    return json({ok: true});
  }
  return null;
}
