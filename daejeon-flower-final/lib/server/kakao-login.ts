import {Env,assert,body,json,hash,token,constantEqual,sameOrigin} from './types';
import {normalizePhone,configuredOrigin} from './solapi';
import {kakaoFeatureApi,finishFeature} from './kakao-features';
import {admin} from './auth';
const authCookie='__Host-dfds_member',pendingCookie='__Host-dfds_signup',stateCookie='__Host-dfds_kakao_state';
export const memberPolicy='member-v1-20261107';
export function kakaoPhone(value:unknown){let s=typeof value==='string'?value.replace(/[^0-9]/g,''):'';if(s.startsWith('8201'))s=s.slice(2);return normalizePhone(s)}
const cookieValue=(req:Request,name:string)=>(req.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1)||'';
const setCookie=(name:string,raw:string,maxAge:number,lax=false)=>name+'='+raw+'; Path=/; Secure; HttpOnly; SameSite='+(lax?'Lax':'Strict')+'; Max-Age='+maxAge;
function redirect(path:string,cookies:string[]=[]){const h=new Headers({'Location':path,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});cookies.forEach(c=>h.append('Set-Cookie',c));return new Response(null,{status:303,headers:h})}
function ready(env:Env){return env.KAKAO_LOGIN_ENABLED==='true'&&!!env.KAKAO_REST_API_KEY&&!!env.KAKAO_CLIENT_SECRET&&!!configuredOrigin(env)&&env.SESSION_SECRET?.length>=32}
function origin(req:Request,env:Env){const value=new URL(env.PUBLIC_ORIGIN||req.url);assert(value.protocol==='https:'&&new URL(req.url).origin===value.origin,400,'홈페이지의 대표 주소로 접속해주세요.');return value.origin}
export function validBirthday(value:unknown){if(value==='')return true;if(typeof value!=='string'||!/^\d{2}-\d{2}$/.test(value))return false;const [m,d]=value.split('-').map(Number);return m>=1&&m<=12&&d>=1&&d<=new Date(Date.UTC(2000,m,0)).getUTCDate()}
export async function memberSession(req:Request,env:Env,mutating=false){const raw=cookieValue(req,authCookie);assert(/^[a-f0-9]{64}$/.test(raw),401,'카카오로 로그인해주세요.');const row:any=await env.DB.prepare('SELECT customer_id FROM customer_login_sessions WHERE token_hash=? AND expires_at>CURRENT_TIMESTAMP').bind(await hash(raw)).first();assert(row,401,'로그인 기간이 만료되었습니다.');const csrf=await hash(raw+env.SESSION_SECRET);if(mutating){sameOrigin(req);assert(constantEqual(req.headers.get('x-csrf-token')||'',csrf),403,'화면을 새로 열어주세요.')}return {...row,csrf}}
async function signedIn(env:Env,cid:number){const raw=token(),digest=await hash(raw);await env.DB.batch([env.DB.prepare("INSERT INTO customer_login_sessions(token_hash,customer_id,expires_at) VALUES(?,?,datetime('now','+30 days'))").bind(digest,cid),env.DB.prepare("INSERT INTO anniversary_reminder_sessions(token_hash,customer_id,expires_at) VALUES(?,?,datetime('now','+30 days'))").bind(digest,cid)]);return [setCookie(authCookie,raw,2592000),setCookie('__Host-dfds_anniversary',raw,2592000),setCookie(pendingCookie,'',0),setCookie(stateCookie,'',0,true)]}
async function pending(req:Request,env:Env){const raw=cookieValue(req,pendingCookie);assert(/^[a-f0-9]{64}$/.test(raw),401,'카카오 로그인을 먼저 진행해주세요.');const row:any=await env.DB.prepare('SELECT * FROM kakao_signup_sessions WHERE token_hash=? AND consumed=0 AND expires_at>CURRENT_TIMESTAMP').bind(await hash(raw)).first();assert(row,401,'가입 시간이 만료되었습니다. 다시 로그인해주세요.');return {...row,claims:JSON.parse(row.claims_json),csrf:await hash(raw+env.SESSION_SECRET)}}
async function provider(url:string,init:RequestInit){const r=await fetch(url,{...init,redirect:'manual',signal:AbortSignal.timeout(15000)});assert(r.ok,502,'카카오 로그인 응답을 확인하지 못했습니다. 다시 시도해주세요.');return await r.json() as any}
export async function kakaoLoginApi(req:Request,env:Env,path:string):Promise<Response|null>{
 if(path.startsWith('/auth/features'))return await kakaoFeatureApi(req,env,path);
 if(path==='/auth/config'&&req.method==='GET'){let enabled=!!ready(env);if(enabled&&env.KAKAO_LOGIN_TEST_ONLY==='true'){try{await admin(req,env,['OWNER'])}catch{enabled=false}}return json({enabled,testOnly:env.KAKAO_LOGIN_TEST_ONLY==='true'})}
 if(path==='/auth/kakao/start'&&req.method==='POST'){
  sameOrigin(req);assert(ready(env),503,'카카오 로그인 연결을 준비하고 있습니다.');if(env.KAKAO_LOGIN_TEST_ONLY==='true')await admin(new Request(req.url,{headers:req.headers}),env,['OWNER']);const base=origin(req,env),raw=token();await env.DB.prepare("INSERT INTO kakao_login_states(state_hash,expires_at) VALUES(?,datetime('now','+10 minutes'))").bind(await hash(raw)).run();
  const u=new URL('https://kauth.kakao.com/oauth/authorize');u.searchParams.set('response_type','code');u.searchParams.set('client_id',env.KAKAO_REST_API_KEY!);u.searchParams.set('redirect_uri',base+'/api/auth/kakao/callback');u.searchParams.set('state',raw);
  const scopes=(env.KAKAO_LOGIN_SCOPES||'').split(',').filter(Boolean);assert(scopes.every(v=>['name','phone_number','birthday'].includes(v)),503,'로그인 수집 항목 설정을 확인해주세요.');if(scopes.length)u.searchParams.set('scope',scopes.join(','));
  return redirect(u.href,[setCookie(stateCookie,raw,600,true)]);
 }
 if(path==='/auth/kakao/callback'&&req.method==='GET'){
  assert(ready(env),503,'카카오 로그인 연결을 준비하고 있습니다.');const base=origin(req,env),u=new URL(req.url),state=u.searchParams.get('state')||'',saved=cookieValue(req,stateCookie);assert(/^[a-f0-9]{64}$/.test(state)&&constantEqual(state,saved),403,'로그인 요청을 다시 시작해주세요.');
  const featureState=await env.DB.prepare('SELECT feature FROM kakao_feature_states WHERE state_hash=?').bind(await hash(state)).first();
  if(featureState)return await finishFeature(req,env,state);
  const claim=await env.DB.prepare("UPDATE kakao_login_states SET consumed=1 WHERE state_hash=? AND consumed=0 AND expires_at>CURRENT_TIMESTAMP").bind(await hash(state)).run();assert(claim.meta.changes===1,403,'이미 처리되었거나 만료된 로그인입니다.');
  if(u.searchParams.has('error'))return redirect('/register?error=cancelled',[setCookie(stateCookie,'',0,true)]);
  const code=u.searchParams.get('code')||'';assert(code.length>0&&code.length<2048,400,'카카오 인증 응답을 확인해주세요.');
  try{
   const access=await provider('https://kauth.kakao.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:env.KAKAO_REST_API_KEY!,client_secret:env.KAKAO_CLIENT_SECRET!,redirect_uri:base+'/api/auth/kakao/callback',code})});assert(typeof access.access_token==='string',502,'카카오 인증을 다시 시도해주세요.');
   const profile=await provider('https://kapi.kakao.com/v2/user/me',{headers:{Authorization:'Bearer '+access.access_token}});assert(Number.isSafeInteger(profile.id)&&profile.id>0,502,'카카오 회원 정보를 확인해주세요.');const id=String(profile.id);
   const member:any=await env.DB.prepare('SELECT customer_id FROM kakao_members WHERE kakao_id=?').bind(id).first();if(member)return redirect('/account',await signedIn(env,member.customer_id));
   const a=profile.kakao_account||{},phone=a.phone_number_needs_agreement?'':kakaoPhone(a.phone_number),birthday=!a.birthday_needs_agreement&&a.birthday_type==='SOLAR'&&/^\d{4}$/.test(a.birthday||'')?a.birthday.slice(0,2)+'-'+a.birthday.slice(2):'';
   const claims={name:!a.name_needs_agreement&&typeof a.name==='string'?a.name.slice(0,50):'',phone:/^01\d{8,9}$/.test(phone)?phone:'',birthday:validBirthday(birthday)?birthday:''};
   const raw=token();await env.DB.prepare("INSERT INTO kakao_signup_sessions(token_hash,kakao_id,claims_json,expires_at) VALUES(?,?,?,datetime('now','+15 minutes'))").bind(await hash(raw),id,JSON.stringify(claims)).run();
   return redirect('/register',[setCookie(pendingCookie,raw,900),setCookie(stateCookie,'',0,true)]);
  }catch{return redirect('/register?error=provider',[setCookie(stateCookie,'',0,true)])}
 }
 if(path==='/auth/signup'&&req.method==='GET'){const p=await pending(req,env);return json({csrf:p.csrf,profile:p.claims,policyVersion:memberPolicy})}
 if(path==='/auth/signup'&&req.method==='POST'){
  sameOrigin(req);const p=await pending(req,env);assert(constantEqual(req.headers.get('x-csrf-token')||'',p.csrf),403,'가입 화면을 새로 열어주세요.');const b=await body(req,2048);assert(b.terms===true&&b.privacy===true&&b.policyVersion===memberPolicy,400,'필수 약관과 개인정보 안내를 확인해주세요.');
  assert(typeof b.name==='string'&&b.name.trim().length<=50&&typeof b.phone==='string'&&typeof b.birthday==='string'&&validBirthday(b.birthday),400,'이름·전화번호·생일을 확인해주세요.');
  const phone=normalizePhone(b.phone);assert(!b.phone.trim()||!!phone,400,'국내 휴대전화번호를 입력해주세요.');const verified=!!phone&&phone===p.claims.phone,cid=Number.parseInt(token().slice(0,12),16)+1;
  // A guest-entered phone never authorizes access to another customer. Existing phone records are not merged.
  const occupied=phone?await env.DB.prepare('SELECT id FROM customers WHERE phone_normalized=?').bind(phone).first():null;
  const verifiedUnique=verified&&!occupied?phone:null;
  const statements=[env.DB.prepare('INSERT INTO customers(id,name,phone_normalized) VALUES(?,?,?)').bind(cid,b.name.trim()||null,verifiedUnique),env.DB.prepare('INSERT INTO kakao_members(kakao_id,customer_id,contact_phone,birthday,phone_verified,terms_version) VALUES(?,?,?,?,?,?)').bind(p.kakao_id,cid,phone||null,b.birthday||null,+verified,memberPolicy),env.DB.prepare("UPDATE kakao_signup_sessions SET consumed=1 WHERE token_hash=? AND consumed=0 AND expires_at>CURRENT_TIMESTAMP").bind(p.token_hash)];
  // One conditional claim prevents replay before the atomic creation batch.
  const consumed=await env.DB.prepare("UPDATE kakao_signup_sessions SET consumed=2 WHERE token_hash=? AND consumed=0 AND expires_at>CURRENT_TIMESTAMP").bind(p.token_hash).run();assert(consumed.meta.changes===1,409,'가입 요청을 다시 확인해주세요.');
  try{statements[2]=env.DB.prepare('UPDATE kakao_signup_sessions SET consumed=1 WHERE token_hash=? AND consumed=2').bind(p.token_hash);await env.DB.batch(statements)}catch(e){await env.DB.prepare('UPDATE kakao_signup_sessions SET consumed=0 WHERE token_hash=? AND consumed=2').bind(p.token_hash).run();throw e}
  const cookies=await signedIn(env,cid);const h=new Headers({'Content-Type':'application/json','Cache-Control':'no-store'});cookies.forEach(c=>h.append('Set-Cookie',c));return new Response(JSON.stringify({ok:true,redirect:'/account'}),{headers:h});
 }
 if(path==='/auth/orders'&&req.method==='GET'){const s=await memberSession(req,env);const result:any=await env.DB.prepare("SELECT o.order_no,o.status,o.payment_status,o.total_krw,o.fulfillment_at,o.fulfillment_type,i.product_name_snapshot,i.variant_name_snapshot FROM orders o JOIN order_items i ON i.id=(SELECT MIN(id) FROM order_items WHERE order_id=o.id) WHERE o.customer_id=? AND o.payment_status IN ('PAID','REFUNDED','PARTIAL_REFUND','CANCELLED') ORDER BY o.id DESC LIMIT 50").bind(s.customer_id).all();return json({rows:result.results})}
 if(path==='/auth/session'&&req.method==='GET'){const s=await memberSession(req,env);const row:any=await env.DB.prepare('SELECT c.name,m.contact_phone,m.birthday,m.phone_verified,c.phone_normalized FROM kakao_members m JOIN customers c ON c.id=m.customer_id WHERE c.id=?').bind(s.customer_id).first();assert(row,401,'다시 로그인해주세요.');return json({csrf:s.csrf,name:row.name||'',phone:row.contact_phone||'',birthday:row.birthday||'',phoneVerified:!!row.phone_verified,reminderPhoneReady:!!row.phone_normalized})}
 if(path==='/auth/logout'&&req.method==='POST'){const s=await memberSession(req,env,true),raw=cookieValue(req,authCookie),digest=await hash(raw);await env.DB.batch([env.DB.prepare('DELETE FROM customer_login_sessions WHERE token_hash=?').bind(digest),env.DB.prepare('DELETE FROM kakao_feature_tokens WHERE customer_id=?').bind(s.customer_id),env.DB.prepare('DELETE FROM anniversary_reminder_sessions WHERE token_hash=?').bind(digest)]);const h=new Headers({'Content-Type':'application/json','Cache-Control':'no-store'});[setCookie(authCookie,'',0),setCookie('__Host-dfds_anniversary','',0)].forEach(c=>h.append('Set-Cookie',c));return new Response('{"ok":true}',{headers:h})}
 return null;
}
export async function cleanupMemberAuth(env:Env){await env.DB.batch([
 env.DB.prepare('DELETE FROM kakao_signup_sessions WHERE expires_at<CURRENT_TIMESTAMP OR consumed=1'),
 env.DB.prepare('DELETE FROM kakao_login_states WHERE expires_at<CURRENT_TIMESTAMP'),
 env.DB.prepare('DELETE FROM kakao_feature_states WHERE expires_at<CURRENT_TIMESTAMP'),
 env.DB.prepare('DELETE FROM kakao_feature_tokens WHERE expires_at<CURRENT_TIMESTAMP'),
 env.DB.prepare('DELETE FROM customer_login_sessions WHERE expires_at<CURRENT_TIMESTAMP')
 ])}
