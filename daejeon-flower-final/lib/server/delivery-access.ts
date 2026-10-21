import { Env, assert, body, hash, json, sameOrigin, token } from './types';
import { configuredOrigin, hmac } from './solapi';

function cookieName(orderId: number) { return `__Host-dfds_delivery_${orderId}`; }
async function rawAccess(env: Env, orderId: number, nonce: string) {
  return hmac(env.SESSION_SECRET, `delivery-photo:v1:${orderId}:${nonce}`);
}
export async function deliveryLink(env: Env, order: {id: number; order_no: string}) {
  assert(env.SESSION_SECRET?.length >= 32 && configuredOrigin(env), 503, '고객 사진 확인 연결 설정이 필요합니다.');
  const nonce = token(), raw = await rawAccess(env, order.id, nonce);
  await env.DB.prepare("INSERT OR IGNORE INTO delivery_photo_access(order_id,nonce,token_hash,expires_at) VALUES(?,?,?,datetime('now','+90 days'))").bind(order.id, nonce, await hash(raw)).run();
  const row: any = await env.DB.prepare('SELECT * FROM delivery_photo_access WHERE order_id=? AND expires_at>CURRENT_TIMESTAMP').bind(order.id).first();
  assert(row, 410, '사진 확인 링크가 만료되었습니다.');
  return `${configuredOrigin(env)}/delivery?order=${encodeURIComponent(order.order_no)}#access=${await rawAccess(env, order.id, row.nonce)}`;
}

async function lookup(env: Env, orderNo: string) {
  return env.DB.prepare("SELECT o.id,o.order_no,o.completed_at,a.token_hash FROM orders o JOIN delivery_photo_access a ON a.order_id=o.id WHERE o.order_no=? AND o.status='DELIVERED' AND o.payment_status='PAID' AND a.expires_at>CURRENT_TIMESTAMP").bind(orderNo).first<any>();
}

export async function deliveryAccessApi(req: Request, env: Env, path: string): Promise<Response | null> {
  const match = path.match(/^\/delivery\/([A-Za-z0-9_-]{1,100})(?:\/(session|photos\/\d+))?$/);
  if (!match) return null;
  const row = await lookup(env, match[1]);
  assert(row, 404, '사진을 확인할 수 없습니다. 매장에 문의해주세요.');
  const headers = {'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive'};
  if (match[2] === 'session' && req.method === 'POST') {
    sameOrigin(req);
    const data = await body(req, 1024);
    assert(typeof data.token === 'string' && /^[a-f0-9]{64}$/.test(data.token) && await hash(data.token) === row.token_hash, 403, '사진 확인 링크를 다시 열어주세요.');
    return json({ok: true}, 200, {...headers, 'Set-Cookie': `${cookieName(row.id)}=${data.token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=604800`});
  }
  assert(['GET','HEAD'].includes(req.method) && match[2] !== 'session', 405, '지원하지 않는 요청입니다.');
  const raw = (req.headers.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(cookieName(row.id) + '='))?.split('=')[1] || '';
  assert(/^[a-f0-9]{64}$/.test(raw) && await hash(raw) === row.token_hash, 403, '카카오톡의 사진 확인 링크를 다시 열어주세요.');
  if (match[2]?.startsWith('photos/')) {
    const mediaId = Number(match[2].split('/')[1]);
    const media: any = await env.DB.prepare("SELECT m.r2_key FROM media m JOIN order_media om ON om.media_id=m.id WHERE om.order_id=? AND m.id=? AND om.kind='DELIVERY_COMPLETE' LIMIT 1").bind(row.id, mediaId).first();
    assert(media, 404, '사진을 찾지 못했습니다.');
    const object = await env.MEDIA.get(media.r2_key);
    assert(object, 404, '사진을 찾지 못했습니다.');
    return new Response(req.method === 'HEAD' ? null : object.body, {headers: {...headers, 'Cache-Control': 'private, no-store', 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox"}});
  }
  const photos = await env.DB.prepare("SELECT DISTINCT m.id FROM media m JOIN order_media om ON om.media_id=m.id WHERE om.order_id=? AND om.kind='DELIVERY_COMPLETE' ORDER BY m.id DESC").bind(row.id).all();
  const items = await env.DB.prepare('SELECT product_name_snapshot,variant_name_snapshot FROM order_items WHERE order_id=? ORDER BY id').bind(row.id).all();
  return json({orderNo: row.order_no, completedAt: row.completed_at,
    products: items.results.map((v: any) => [v.product_name_snapshot, v.variant_name_snapshot].filter(Boolean).join(' ')),
    photos: photos.results.map((v: any) => ({id: v.id, src: `/api/delivery/${encodeURIComponent(row.order_no)}/photos/${v.id}`}))}, 200, headers);
}
