const bytes = (text: string) => new TextEncoder().encode(text);
export const base64url = (data: Uint8Array) => btoa(String.fromCharCode(...data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const decodePushBytes = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const concat = (...parts: Uint8Array[]) => {
  const result = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
};
const hkdf = async (secret: BufferSource, salt: BufferSource, info: BufferSource, length: number) => {
  const key = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF', hash:'SHA-256', salt, info}, key, length * 8));
};
export function applePushEndpoint(value: unknown): URL | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.port && !url.username && !url.password && !url.hash
        && url.hostname.endsWith('.push.apple.com') && url.pathname.length > 1) return url;
  } catch {}
  return null;
}
export async function encodePush(payload: string, receiverKey: Uint8Array<ArrayBuffer>, auth: Uint8Array<ArrayBuffer>) {
  const keys = await crypto.subtle.generateKey({name:'ECDH', namedCurve:'P-256'}, true, ['deriveBits']) as CryptoKeyPair;
  const senderKey = new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey));
  const receiver = await crypto.subtle.importKey('raw', receiverKey, {name:'ECDH', namedCurve:'P-256'}, false, []);
  const ecdh = await crypto.subtle.deriveBits({name:'ECDH', public:receiver}, keys.privateKey, 256);
  const ikm = await hkdf(ecdh, auth, concat(bytes('WebPush: info\0'), receiverKey, senderKey), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const [keyBytes, nonce] = await Promise.all([
    hkdf(ikm, salt, bytes('Content-Encoding: aes128gcm\0'), 16),
    hkdf(ikm, salt, bytes('Content-Encoding: nonce\0'), 12),
  ]);
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const record = concat(bytes(payload), new Uint8Array([2]));
  if (record.length + 16 > 4096) throw new Error('PUSH_PAYLOAD_LENGTH');
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv:nonce}, key, record));
  return concat(salt, new Uint8Array([0, 0, 16, 0, senderKey.length]), senderKey, encrypted);
}
export async function sendAppleOrderPush(endpoint: string, key: string, auth: string, privateJwk: JsonWebKey, contact: string, message: string, topic?: string) {
  const url = applePushEndpoint(endpoint);
  if (!url || !privateJwk.x || !privateJwk.y) throw new Error('PUSH_CONFIG');
  const signingKey = await crypto.subtle.importKey('jwk', privateJwk, {name:'ECDSA', namedCurve:'P-256'}, false, ['sign']);
  const jwt = base64url(bytes(JSON.stringify({typ:'JWT', alg:'ES256'}))) + '.'
    + base64url(bytes(JSON.stringify({aud:url.origin, exp:Math.floor(Date.now()/1000)+3600, sub:contact})));
  const signature = await crypto.subtle.sign({name:'ECDSA', hash:'SHA-256'}, signingKey, bytes(jwt));
  const vapidKey = base64url(concat(new Uint8Array([4]), decodePushBytes(privateJwk.x), decodePushBytes(privateJwk.y)));
  const response = await fetch(url.toString(), {
    method:'POST', redirect:'error', signal:AbortSignal.timeout(7000),
    headers:{
      Authorization:'vapid t=' + jwt + '.' + base64url(new Uint8Array(signature)) + ', k=' + vapidKey,
      TTL:'3600', Urgency:'high', 'Content-Encoding':'aes128gcm', 'Content-Type':'application/octet-stream',
      ...(topic ? {Topic:topic} : {}),
    },
    body:await encodePush(message, decodePushBytes(key), decodePushBytes(auth)),
  });
  await response.body?.cancel().catch(()=>{});
  return response.status;
}
