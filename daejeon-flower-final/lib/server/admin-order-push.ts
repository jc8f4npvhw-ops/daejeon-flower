import {admin} from './auth';
import {type Env, HttpError, assert, body, json} from './types';
import {applePushEndpoint, base64url, decodePushBytes, sendAppleOrderPush} from './admin-order-web-push';

type PushEnv = Env & {ADMIN_ORDER_PUSH_JWK?: string};
type Device = {id:number; endpoint:string; p256dh:string; auth_secret:string};
const contact = 'https://xn--js0bx4ezvk5jm1b610k.com/';
const pathPrefix = '/api/admin/order-push/';
function config(env: PushEnv) {
  const key = JSON.parse(env.ADMIN_ORDER_PUSH_JWK ?? '{}') as JsonWebKey;
  assert(key.kty === 'EC' && key.crv === 'P-256' && key.d && key.x && key.y, 503, '아이폰 푸시 서버 설정이 아직 준비되지 않았습니다.');
  const publicBytes = new Uint8Array(65);
  const x = decodePushBytes(key.x), y = decodePushBytes(key.y);
  assert(x.length === 32 && y.length === 32 && decodePushBytes(key.d).length === 32, 503, '아이폰 푸시 키를 확인해 주세요.');
  publicBytes[0] = 4; publicBytes.set(x, 1); publicBytes.set(y, 33);
  return {privateKey:key, publicKey:base64url(publicBytes)};
}
const push = (d:Device, key:JsonWebKey, test = false, order?:number) => sendAppleOrderPush(
  d.endpoint, d.p256dh, d.auth_secret, key, contact,
  JSON.stringify(test ? {title:'대전꽃백화점', body:'주문 푸시 알림이 연결됐어요.', tag:'order-push-test'}
    : {title:'대전꽃백화점', body:'결제가 완료된 새 주문이 들어왔어요. 관리자에서 확인해 주세요.', tag:'order-'+order}),
  test ? 'order-push-test' : 'order-'+order);
export async function handleAdminOrderPush(req: Request, env: PushEnv, path: string): Promise<Response> {
  try {
    const action = path.slice(pathPrefix.length);
    const valid = (req.method === 'GET' && action === 'config') ||
      (req.method === 'POST' && ['status','subscribe','unsubscribe','test'].includes(action));
    assert(valid, 404, '요청한 알림 기능을 찾을 수 없습니다.');
    const user = await admin(req,env,['OWNER','MANAGER']);
    const {privateKey, publicKey} = config(env);
    if (action === 'config') {
      assert(await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_order_push_devices'").first(),
        503,'푸시 알림 데이터베이스 설정이 아직 준비되지 않았습니다.');
      return json({publicKey});
    }
    const input = await body(req, 4096);
    const url = applePushEndpoint(input.endpoint);
    assert(url, 400, '아이폰 홈 화면 앱에서 알림을 연결해 주세요.');
    const endpoint = url.toString();
    if (action === 'subscribe') {
      const k = input.keys;
      assert(typeof k?.p256dh === 'string' && /^[\w-]{87}$/.test(k.p256dh)
        && typeof k?.auth === 'string' && /^[\w-]{22}$/.test(k.auth), 400, '아이폰 알림 정보를 확인해 주세요.');
      const raw = decodePushBytes(k.p256dh);
      assert(raw.length === 65 && raw[0] === 4 && decodePushBytes(k.auth).length === 16, 400, '아이폰 알림 정보를 확인해 주세요.');
      try { await crypto.subtle.importKey('raw',raw,{name:'ECDH',namedCurve:'P-256'},false,[]); }
      catch { throw new HttpError(400, '아이폰 알림 정보를 확인해 주세요.'); }
      const existing = await env.DB.prepare('SELECT id, admin_user_id FROM admin_order_push_devices WHERE endpoint=?').bind(endpoint)
        .first<{id:number; admin_user_id:number}>();
      if (existing?.admin_user_id !== user.id) {
        assert(!existing, 409,'이 아이폰에 다른 관리자 계정의 알림이 이미 연결돼 있습니다.');
        const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_order_push_devices WHERE admin_user_id=?').bind(user.id).first<{n:number}>();
        assert(Number(row?.n ?? 0) < 5, 409, '관리자당 아이폰을 최대 5대 연결할 수 있습니다.');
      }
      const saved = await env.DB.prepare(`INSERT INTO admin_order_push_devices(admin_user_id,endpoint,p256dh,auth_secret,first_event_after)
        VALUES(?,?,?,?,(SELECT COALESCE((SELECT seq FROM sqlite_sequence WHERE name='admin_order_push_events'),0)))
        ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh,auth_secret=excluded.auth_secret
        WHERE admin_order_push_devices.admin_user_id=excluded.admin_user_id`)
        .bind(user.id,endpoint,k.p256dh,k.auth).run();
      assert(saved.meta.changes === 1,409,'이 아이폰에 다른 관리자 계정의 알림이 이미 연결돼 있습니다.');
      return json({enabled:true});
    }
    if (action === 'status') {
      const found = await env.DB.prepare('SELECT id FROM admin_order_push_devices WHERE endpoint=? AND admin_user_id=?')
        .bind(endpoint,user.id).first();
      return json({enabled:Boolean(found)});
    }
    if (action === 'unsubscribe') {
      await env.DB.prepare('DELETE FROM admin_order_push_devices WHERE endpoint=? AND admin_user_id=?').bind(endpoint,user.id).run();
      return json({enabled:false});
    }
    const device = await env.DB.prepare('SELECT id,endpoint,p256dh,auth_secret FROM admin_order_push_devices WHERE endpoint=? AND admin_user_id=?')
      .bind(endpoint,user.id).first<Device>();
    assert(device, 404, '먼저 이 아이폰의 주문 푸시를 연결해 주세요.');
    const claim = await env.DB.prepare('UPDATE admin_order_push_devices SET last_test_at=unixepoch() WHERE id=? AND last_test_at<=unixepoch()-15')
      .bind(device.id).run();
    assert(claim.meta.changes === 1,429,'테스트 알림은 15초 뒤 다시 보낼 수 있습니다.');
    const status = await push(device,privateKey,true);
    if (status === 404 || status === 410) {
      await env.DB.prepare('DELETE FROM admin_order_push_devices WHERE id=?').bind(device.id).run();
      throw new HttpError(410,'아이폰 푸시 연결이 만료됐습니다. 다시 연결해 주세요.');
    }
    assert(status >= 200 && status < 300, 502, '애플이 테스트 푸시를 받지 못했습니다. 서버 설정을 확인해 주세요.');
    return json({ok:true});
  } catch (e) {
    return e instanceof HttpError ? json({message:e.message},e.status) : json({message:'아이폰 푸시를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'},503);
  }
}
export async function dispatchAdminOrderPush(env: PushEnv, cleanup = false) {
  if (!env.ADMIN_ORDER_PUSH_JWK) return;
  const {privateKey} = config(env);
  const {results} = await env.DB.prepare(`SELECT e.id AS event_id,e.order_id,d.id,d.endpoint,d.p256dh,d.auth_secret
    FROM admin_order_push_events e
    JOIN orders o ON o.id=e.order_id AND o.payment_status IN ('PAID','PARTIAL_REFUND') AND o.status IN ('NEW','IN_PRODUCTION')
    JOIN admin_order_push_devices d ON d.first_event_after<e.id
    JOIN admin_users u ON u.id=d.admin_user_id AND u.is_active=1 AND u.role IN ('OWNER','MANAGER')
    LEFT JOIN admin_order_push_deliveries l ON l.event_id=e.id AND l.device_id=d.id
    WHERE e.created_at>=unixepoch()-3600
      AND EXISTS(SELECT 1 FROM payments p WHERE p.order_id=o.id AND p.approved_at IS NOT NULL AND COALESCE(p.provider_payment_key,'')<>'')
      AND NOT EXISTS(SELECT 1 FROM order_alert_acknowledgements a WHERE a.order_id=o.id)
      AND (l.event_id IS NULL OR (l.done=0 AND l.attempts<3 AND l.next_at<=unixepoch()))
    ORDER BY e.id,d.id LIMIT 12`).all<Device & {event_id:number;order_id:number}>();
  await Promise.all(results.map(async d => {
    const claim = await env.DB.prepare(`INSERT INTO admin_order_push_deliveries(event_id,device_id,attempts,next_at)
      VALUES(?,?,1,unixepoch()+60) ON CONFLICT(event_id,device_id) DO UPDATE
      SET attempts=attempts+1,next_at=unixepoch()+60
      WHERE done=0 AND attempts<3 AND next_at<=unixepoch()`).bind(d.event_id,d.id).run();
    if (claim.meta.changes !== 1) return;
    let status = 0;
    try { status = await push(d,privateKey,false,d.order_id); } catch {}
    if (status === 404 || status === 410) {
      await env.DB.prepare('DELETE FROM admin_order_push_devices WHERE id=?').bind(d.id).run();
    }
    if ((status >= 200 && status < 300) || status === 404 || status === 410) {
      await env.DB.prepare('UPDATE admin_order_push_deliveries SET done=1 WHERE event_id=? AND device_id=?').bind(d.event_id,d.id).run();
    }
  }));
  if (cleanup) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM admin_order_push_deliveries WHERE event_id IN (SELECT id FROM admin_order_push_events WHERE created_at<unixepoch()-86400)'),
      env.DB.prepare('DELETE FROM admin_order_push_events WHERE created_at<unixepoch()-86400'),
    ]);
  }
}
