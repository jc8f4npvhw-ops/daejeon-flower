import type { Env } from './types';

export const deliveryTemplate = 'KA01TP2610201709032423Gh5ro5fvey';
export const deliveryChannel = 'KA01PF261020165851146fAw6zXfI0v7';
const apiOrigin = 'https://api.solapi.com';
const hex = (value: ArrayBuffer) => Array.from(new Uint8Array(value), b => b.toString(16).padStart(2, '0')).join('');

export async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

export function normalizePhone(value: string) {
  let phone = String(value || '').replace(/[^0-9]/g, '');
  if (phone.startsWith('82')) phone = '0' + phone.slice(2);
  return /^01[016789]\d{7,8}$/.test(phone) ? phone : '';
}

export function configuredOrigin(env: Env) {
  try {
    const url = new URL(env.PUBLIC_ORIGIN || '');
    return url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash ? url.origin : '';
  } catch { return ''; }
}

export function sendingReady(env: Env) {
  return env.KAKAO_SENDING_ENABLED === 'true' && !!env.SOLAPI_API_KEY && !!env.SOLAPI_API_SECRET &&
    !!configuredOrigin(env) && env.SESSION_SECRET?.length >= 32;
}

export async function solapiRequest(env: Env, path: string, payload?: unknown) {
  // Fixed API origin and generated paths only. Never accept a caller-supplied endpoint.
  if (!/^\/messages\/v4\/(send-many\/detail|groups\/[A-Za-z0-9_-]+)$/.test(path)) throw Error('INVALID_PROVIDER_PATH');
  const date = new Date().toISOString();
  const salt = crypto.randomUUID().replaceAll('-', '');
  const signature = await hmac(env.SOLAPI_API_SECRET!, date + salt);
  return fetch(apiOrigin + path, {
    method: payload === undefined ? 'GET' : 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
    headers: {'Content-Type': 'application/json', Authorization: `HMAC-SHA256 apiKey=${env.SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`},
    ...(payload === undefined ? {} : {body: JSON.stringify(payload)})
  });
}

export function deliveryPayload(env: Env, phone: string, orderNo: string, link: string, eventId: string) {
  const url = new URL(link);
  if (url.origin !== configuredOrigin(env) || url.protocol !== 'https:') throw Error('INVALID_PHOTO_LINK');
  return {allowDuplicates: false, showMessageList: true, messages: [{
    to: phone, type: 'ATA', country: '82', customFields: {deliveryEventId: eventId},
    kakaoOptions: {
      pfId: env.SOLAPI_CHANNEL_ID || deliveryChannel,
      templateId: env.SOLAPI_DELIVERY_TEMPLATE_ID || deliveryTemplate,
      disableSms: true,
      // Approved button is https://#{확인링크}; pass host/path/fragment without the scheme.
      variables: {'#{주문번호}': orderNo, '#{확인링크}': url.href.slice('https://'.length)}
    }
  }]};
}
