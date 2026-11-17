export type TrafficConfig = {GA4_PROPERTY_ID?: string; GA4_SERVICE_ACCOUNT_JSON?: string};
const tokenUrl = 'https://oauth2.googleapis.com/token';
const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const encode = (value: unknown) => b64url(enc.encode(JSON.stringify(value)));

export async function readGa4Traffic(config: TrafficConfig, days: 7 | 30, request = fetch) {
 const property = config.GA4_PROPERTY_ID?.trim();
 if (!property || !config.GA4_SERVICE_ACCOUNT_JSON) return null;
 if (!/^\d+$/.test(property)) throw Error('Invalid property');
 const {client_email: email, private_key: pem} = JSON.parse(config.GA4_SERVICE_ACCOUNT_JSON);
 if (typeof email !== 'string' || typeof pem !== 'string') throw Error('Invalid credentials');
 const bytes = Uint8Array.from(atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')), c => c.charCodeAt(0));
 const key = await crypto.subtle.importKey('pkcs8', bytes, {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, ['sign']);
 const iat = Math.floor(Date.now()/1000);
 const payload = encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:email,scope:'https://www.googleapis.com/auth/analytics.readonly',aud:tokenUrl,iat,exp:iat+3600});
 const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(payload));
 const token = await request(tokenUrl,{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:payload+'.'+b64url(new Uint8Array(signature))}),signal:AbortSignal.timeout(8000)});
 if (!token.ok) throw Error('Google authentication failed');
 const {access_token} = await token.json() as {access_token?:string};
 if (!access_token) throw Error('Missing access token');
 const report = await request('https://analyticsdata.googleapis.com/v1beta/properties/'+property+':runReport',{
   method:'POST', headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},
   body:JSON.stringify({dateRanges:[{startDate:(days-1)+'daysAgo',endDate:'today'}],metrics:['activeUsers','sessions','screenPageViews'].map(name=>({name}))}),
   signal:AbortSignal.timeout(8000)
 });
 if (!report.ok) throw Error('Google report failed');
 const data = await report.json() as {rows?:{metricValues:{value:string}[]}[]};
 const values = data.rows?.[0]?.metricValues.map(v=>Number(v.value)) ?? [0,0,0];
 if (values.length!==3 || values.some(v=>!Number.isSafeInteger(v)||v<0)) throw Error('Invalid metric values');
 return {activeUsers:values[0],sessions:values[1],pageViews:values[2]};
}
