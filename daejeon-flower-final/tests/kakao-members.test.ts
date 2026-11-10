import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers';
import {handleApi} from '../lib/server/router';
import {hash,token} from '../lib/server/types';
import {memberPolicy,validBirthday,kakaoPhone} from '../lib/server/kakao-login';
import {loadContent} from '../lib/server/content';
import {seal,unseal} from '../lib/server/kakao-features';
const origin='https://store.example';
const req=(path:string,method='GET',payload?:any,cookie='',csrf='')=>new Request(origin+'/api'+path,{method,headers:{origin,'Content-Type':'application/json',cookie,'X-CSRF-Token':csrf},...(payload===undefined?{}:{body:JSON.stringify(payload)})});
function setup(){const env:any=fixture();Object.assign(env,{PUBLIC_ORIGIN:origin,KAKAO_LOGIN_ENABLED:'true',KAKAO_REST_API_KEY:'test-key',KAKAO_CLIENT_SECRET:'test-secret'});return env}
function cookies(r:Response){return r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')}
async function start(env:any){const r=await handleApi(req('/auth/kakao/start','POST'),env);assert.equal(r.status,303);return {state:new URL(r.headers.get('location')!).searchParams.get('state')!,cookie:cookies(r)}}
async function pending(env:any,id=123,claims:any={}){const raw=token();await env.DB.prepare("INSERT INTO kakao_signup_sessions(token_hash,kakao_id,claims_json,expires_at) VALUES(?,?,?,datetime('now','+15 minutes'))").bind(await hash(raw),String(id),JSON.stringify(claims)).run();return {cookie:'__Host-dfds_signup='+raw,csrf:await hash(raw+env.SESSION_SECRET)}}
const form=(extra:any={})=>({name:'',phone:'',birthday:'',terms:true,privacy:true,policyVersion:memberPolicy,...extra});
async function join(env:any,p:any,extra:any={}){return handleApi(req('/auth/signup','POST',form(extra),p.cookie,p.csrf),env)}
test('Kakao login requires configured origin, has browser-bound state and does not request unapproved scopes',async()=>{
 const env=setup();let r=await handleApi(new Request(origin+'/api/auth/kakao/start',{method:'POST',headers:{origin:'https://evil.example'}}),env);assert.equal(r.status,403);
 const s=await start(env);assert.match(s.state,/^[a-f0-9]{64}$/);r=await handleApi(req('/auth/kakao/callback?code=x&state='+s.state),env);assert.equal(r.status,403);
 r=await handleApi(req('/auth/kakao/start','POST'),env);const u=new URL(r.headers.get('location')!);assert.equal(u.origin,'https://kauth.kakao.com');assert.equal(u.searchParams.get('redirect_uri'),origin+'/api/auth/kakao/callback');assert.equal(u.searchParams.has('scope'),false);
 env.KAKAO_LOGIN_SCOPES='friends';assert.equal((await handleApi(req('/auth/kakao/start','POST'),env)).status,503);env.sql.close();
});
test('owner-only test launch blocks public OAuth even with valid keys',async()=>{
 const env=setup();env.KAKAO_LOGIN_TEST_ONLY='true';let r=await handleApi(req('/auth/config'),env);assert.equal((await r.json() as any).enabled,false);assert.equal((await handleApi(req('/auth/kakao/start','POST'),env)).status,401);
 env.sql.prepare("INSERT INTO admin_users(id,username,password_hash,display_name,role) VALUES(1,'owner','unused','운영자','OWNER')").run();const raw=token();env.sql.prepare("INSERT INTO admin_sessions(admin_user_id,token_hash,expires_at) VALUES(1,?,datetime('now','+1 hour'))").run(await hash(raw));const ck='__Host-dfds_admin='+raw;
 r=await handleApi(req('/auth/config','GET',undefined,ck),env);assert.equal((await r.json() as any).enabled,true);assert.equal((await handleApi(req('/auth/kakao/start','POST',undefined,ck),env)).status,303);env.sql.close();
});
test('callback exchanges code only once, token remains server-side, scopes absent stay optional',async()=>{
 const env=setup(),s=await start(env),original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(input:any,init:any)=>{calls++;assert.equal(init.redirect,'manual');const url=String(input);if(url.includes('/oauth/token')){assert.equal(new URLSearchParams(init.body).get('client_secret'),'test-secret');return new Response(JSON.stringify({access_token:'private-token',expires_in:3600}))}assert.equal(init.headers.Authorization,'Bearer private-token');return new Response(JSON.stringify({id:123,kakao_account:{name:'선택 고객',phone_number:'+82 10-1234-5678',birthday:'0209',birthday_type:'SOLAR'}}))};
 try{const path='/auth/kakao/callback?code=private-code&state='+s.state;const r=await handleApi(req(path,'GET',undefined,s.cookie),env);assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/register');assert.equal((await r.clone().text()).includes('private-token'),false);
 const p=await handleApi(req('/auth/signup','GET',undefined,cookies(r)),env);const b:any=await p.json();assert.deepEqual(b.profile,{name:'선택 고객',phone:'01012345678',birthday:'02-09'});
 assert.equal((await handleApi(req(path,'GET',undefined,s.cookie),env)).status,403);assert.equal(calls,2);
 }finally{globalThis.fetch=original;env.sql.close()}
});
test('decline and provider failure never create a member or expose provider errors',async()=>{
 const env=setup(),s=await start(env);let r=await handleApi(req('/auth/kakao/callback?error=access_denied&state='+s.state,'GET',undefined,s.cookie),env);assert.equal(r.headers.get('location'),'/register?error=cancelled');
 const s2=await start(env),original=globalThis.fetch;globalThis.fetch=async()=>new Response('secret-provider-detail',{status:500});
 try{r=await handleApi(req('/auth/kakao/callback?code=x&state='+s2.state,'GET',undefined,s2.cookie),env);assert.equal(r.headers.get('location'),'/register?error=provider');assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM kakao_members').get().n,0)}finally{globalThis.fetch=original;env.sql.close()}
});
test('signup requires agreement/CSRF; all three optional fields can be empty; sessions reopen anniversaries',async()=>{
 const env=setup(),p=await pending(env);assert.equal((await handleApi(req('/auth/signup','POST',form(),p.cookie),env)).status,403);assert.equal((await join(env,p,{privacy:false})).status,400);
 const r=await join(env,p);assert.equal(r.status,200);const ck=cookies(r);assert.match(r.headers.get('set-cookie')!,/Secure; HttpOnly; SameSite=Strict/);
 const account=await handleApi(req('/auth/session','GET',undefined,ck),env);assert.equal(account.status,200);const a:any=await account.json();assert.equal(a.phoneVerified,false);
 const reminders=await handleApi(req('/anniversaries','GET',undefined,ck),env);assert.equal(reminders.status,200);assert.deepEqual((await reminders.json() as any).rows,[]);
 assert.equal((await join(env,p)).status,401);assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM customers').get().n,1);env.sql.close();
});
test('typed or occupied phone never merges guest history; verified unused phone may receive future reminders',async()=>{
 const env=setup();env.sql.prepare("INSERT INTO customers(id,name,phone_normalized) VALUES(1,'기존 고객','01012345678')").run();env.sql.prepare("INSERT INTO anniversary_reminders(id,customer_id,label,month,day) VALUES('old',1,'비공개',1,1)").run();
 let p=await pending(env,11,{phone:'01012345678'}),r=await join(env,p,{phone:'01012345678'});assert.equal(r.status,200);
 let a:any=await(await handleApi(req('/anniversaries','GET',undefined,cookies(r)),env)).json();assert.equal(a.rows.length,0);assert.equal(env.sql.prepare("SELECT name FROM customers WHERE id=1").get().name,'기존 고객');
 p=await pending(env,12,{});r=await join(env,p,{phone:'01022223333'});assert.equal(r.status,200);assert.equal(env.sql.prepare("SELECT c.phone_normalized,m.phone_verified FROM kakao_members m JOIN customers c ON c.id=m.customer_id WHERE m.kakao_id='12'").get().phone_normalized,null);
 p=await pending(env,13,{phone:'01044445555'});r=await join(env,p,{phone:'01044445555'});assert.equal(r.status,200);assert.equal(env.sql.prepare("SELECT c.phone_normalized FROM kakao_members m JOIN customers c ON c.id=m.customer_id WHERE m.kakao_id='13'").get().phone_normalized,'01044445555');env.sql.close();
});
test('invalid phone/date rejected; calendar birthday date never forces birth year',async()=>{
 const env=setup(),p=await pending(env);for(const extra of [{phone:'abc'},{birthday:'02-30'},{birthday:'1995-12-20'}])assert.equal((await join(env,p,extra)).status,400);assert.equal(validBirthday('02-29'),true);assert.equal(validBirthday(''),true);assert.equal((await join(env,p,{birthday:'12-20'})).status,200);env.sql.close();
});
test('returning login uses provider identity, rotates session; logout revokes member + matching anniversary access',async()=>{
 const env=setup(),p=await pending(env),first=await join(env,p),s=await start(env),original=globalThis.fetch;
 globalThis.fetch=async(input:any)=>new Response(JSON.stringify(String(input).includes('/oauth/token')?{access_token:'private'}:{id:123}));
 try{const r=await handleApi(req('/auth/kakao/callback?code=x&state='+s.state,'GET',undefined,s.cookie),env);assert.equal(r.headers.get('location'),'/account');assert.notEqual(cookies(r),cookies(first));
 const ck=cookies(r),a:any=await(await handleApi(req('/auth/session','GET',undefined,ck),env)).json();assert.equal((await handleApi(req('/auth/logout','POST',{},ck,'bad'),env)).status,403);
 assert.equal((await handleApi(req('/auth/logout','POST',{},ck,a.csrf),env)).status,200);assert.equal((await handleApi(req('/auth/session','GET',undefined,ck),env)).status,401);assert.equal((await handleApi(req('/anniversaries','GET',undefined,ck),env)).status,401);
 }finally{globalThis.fetch=original;env.sql.close()}
});
test('provider tokens encrypted with customer/feature binding and never usable across contexts',async()=>{const env=setup(),cipher=await seal(env,'never-in-plain-text','1:calendar');assert.equal(cipher.includes('never-in-plain-text'),false);assert.equal(await unseal(env,cipher,'1:calendar'),'never-in-plain-text');await assert.rejects(unseal(env,cipher,'2:calendar'));env.sql.close()});
test('Kakao domestic phone formats normalize without treating arbitrary text as verified',()=>{assert.equal(kakaoPhone('+82 10-1234-5678'),'01012345678');assert.equal(kakaoPhone('+82 010-1234-5678'),'01012345678');assert.equal(kakaoPhone('010-1234-5678'),'01012345678');assert.equal(kakaoPhone('+1 555 1111'),'')});
test('signed-in checkout belongs to that member, guest-supplied account IDs never bind an order',async()=>{
 const env=setup(),p=await pending(env),joined=await join(env,p),ck=cookies(joined);const c=await loadContent(env);Object.assign(c.settings,{paymentsEnabled:true,policiesConfirmed:true,privacy:'개인정보 안내',terms:'약관',refund:'환불 안내',orderPrivacy:'주문 개인정보 안내'});
 env.sql.prepare("INSERT INTO content_blocks(block_key,payload_json) VALUES('STOREFRONT_V1',?) ON CONFLICT(block_key) DO UPDATE SET payload_json=excluded.payload_json").run(JSON.stringify(c));
 const input={sku:{product:'꽃다발',style:'대전꽃백화점 스타일',size:'M'},mode:'픽업',name:'주문자',phone:'01012345678',date:'2099-10-20',time:'10:00',privacy:true,termsAgreed:true,idempotencyKey:token()};
 let r=await handleApi(req('/checkout','POST',input,ck),env);assert.equal(r.status,201,await r.clone().text());
 const cid=env.sql.prepare('SELECT customer_id FROM kakao_members').get().customer_id;assert.equal(env.sql.prepare('SELECT customer_id FROM orders ORDER BY id LIMIT 1').get().customer_id,cid);
 r=await handleApi(req('/checkout','POST',{...input,idempotencyKey:token(),memberCustomerId:cid}),env);assert.equal(r.status,201);assert.equal(env.sql.prepare('SELECT customer_id FROM orders ORDER BY id DESC LIMIT 1').get().customer_id,null);
 env.sql.prepare("UPDATE orders SET payment_status='PAID',status='NEW'").run();const visible:any=await(await handleApi(req('/auth/orders','GET',undefined,ck),env)).json();assert.equal(visible.rows.length,1);assert.equal('orderer_phone' in visible.rows[0],false);env.sql.close();
});
test('additional features require member CSRF, feature switch, own calendar record and fresh friend recipient',async()=>{
 const env=setup(),p=await pending(env),r=await join(env,p),ck=cookies(r),a:any=await(await handleApi(req('/auth/session','GET',undefined,ck),env)).json();
 assert.equal((await handleApi(req('/auth/features/connect','POST',{feature:'calendar'},ck,a.csrf),env)).status,503);
 env.KAKAO_CALENDAR_ENABLED='true';assert.equal((await handleApi(req('/auth/features/connect','POST',{feature:'calendar'},ck,'bad'),env)).status,403);
 const id=env.sql.prepare('SELECT customer_id FROM kakao_members').get().customer_id;env.sql.prepare("INSERT INTO kakao_feature_tokens VALUES(?,'calendar',?,datetime('now','+1 hour'))").run(id,await seal(env,'private-calendar',id+':calendar'));
 assert.equal((await handleApi(req('/auth/features/calendar','POST',{anniversaryId:'other',confirm:true,requestId:token()},ck,a.csrf),env)).status,404);env.sql.close();
});
test('calendar writes only the selected own date, no memo; duplicates and ambiguous writes never resend',async()=>{
 const env=setup(),p=await pending(env),r=await join(env,p),ck=cookies(r),a:any=await(await handleApi(req('/auth/session','GET',undefined,ck),env)).json();
 env.KAKAO_CALENDAR_ENABLED='true';const id=env.sql.prepare('SELECT customer_id FROM kakao_members').get().customer_id;
 env.sql.prepare("INSERT INTO anniversary_reminders(id,customer_id,label,month,day,memo) VALUES('mine',?,'생일',12,20,'비공개 메모'),('uncertain',?,'기념일',12,21,'비공개')").run(id,id);
 env.sql.prepare("INSERT INTO kakao_feature_tokens VALUES(?,'calendar',?,datetime('now','+1 hour'))").run(id,await seal(env,'private-calendar',id+':calendar'));
 const original=globalThis.fetch;let calls=0,fail=false;
 globalThis.fetch=async(input:any,init:any)=>{calls++;assert.equal(String(input),'https://kapi.kakao.com/v2/api/calendar/create/event');const data=JSON.parse(new URLSearchParams(init.body).get('event')!);assert.equal(data.reminders[0],4320);assert.equal(data.time.time_zone,'Asia/Seoul');assert(!JSON.stringify(data).includes('비공개'));if(fail)throw Error('network timeout');return new Response(JSON.stringify({event_id:'event-123'}))};
 try{const b={anniversaryId:'mine',confirm:true,requestId:token()};assert.equal((await handleApi(req('/auth/features/calendar','POST',b,ck,a.csrf),env)).status,200);assert.equal((await handleApi(req('/auth/features/calendar','POST',{...b,requestId:token()},ck,a.csrf),env)).status,200);assert.equal(calls,1);
 fail=true;const unknown={...b,anniversaryId:'uncertain',requestId:token()};assert.equal((await handleApi(req('/auth/features/calendar','POST',unknown,ck,a.csrf),env)).status,502);assert.equal((await handleApi(req('/auth/features/calendar','POST',unknown,ck,a.csrf),env)).status,409);assert.equal(calls,2);
 }finally{globalThis.fetch=original;env.sql.close()}
});
test('friend message validates the recipient from provider, sends fixed public content once, and protects action ownership',async()=>{
 const env=setup(),p=await pending(env),r=await join(env,p),ck=cookies(r),a:any=await(await handleApi(req('/auth/session','GET',undefined,ck),env)).json();
 env.KAKAO_FRIENDS_ENABLED='true';const id=env.sql.prepare('SELECT customer_id FROM kakao_members').get().customer_id;
 env.sql.prepare("INSERT INTO kakao_feature_tokens VALUES(?,'friends',?,datetime('now','+1 hour'))").run(id,await seal(env,'private-friends',id+':friends'));
 const original=globalThis.fetch;let sent=0;globalThis.fetch=async(input:any,init:any)=>{if(String(input).includes('/talk/friends?'))return new Response(JSON.stringify({elements:[{uuid:'friend-a',profile_nickname:'친구'}]}));sent++;const b=new URLSearchParams(init.body);assert.equal(b.get('receiver_uuids'),'["friend-a"]');const t=JSON.parse(b.get('template_object')!);assert.equal(t.link.web_url,origin);assert(!t.text.includes('개인 메모'));return new Response(JSON.stringify({successful_receiver_uuids:['friend-a']}))};
 try{let b={recipient:'forged',confirm:true,requestId:token()};assert.equal((await handleApi(req('/auth/features/message','POST',b,ck,a.csrf),env)).status,403);assert.equal(sent,0);b={...b,recipient:'friend-a'};assert.equal((await handleApi(req('/auth/features/message','POST',b,ck,a.csrf),env)).status,200);assert.equal((await handleApi(req('/auth/features/message','POST',b,ck,a.csrf),env)).status,200);assert.equal(sent,1);
 }finally{globalThis.fetch=original;env.sql.close()}
});
test('feature OAuth is account-bound; a different Kakao account cannot link a token',async()=>{
 const env=setup(),p=await pending(env),r=await join(env,p),ck=cookies(r),a:any=await(await handleApi(req('/auth/session','GET',undefined,ck),env)).json();env.KAKAO_CALENDAR_ENABLED='true';
 const result=await handleApi(req('/auth/features/connect','POST',{feature:'calendar'},ck,a.csrf),env);assert.equal(result.status,200);const location=(await result.json() as any).url,state=new URL(location).searchParams.get('state');assert.equal(new URL(location).searchParams.get('scope'),'talk_calendar');
 const original=globalThis.fetch;globalThis.fetch=async(input:any)=>new Response(JSON.stringify(String(input).includes('/oauth/token')?{access_token:'private',expires_in:3600}:{id:999}));
 try{const done=await handleApi(req('/auth/kakao/callback?code=x&state='+state,'GET',undefined,cookies(result)),env);assert.equal(done.headers.get('location'),'/account?featureError=1');assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM kakao_feature_tokens').get().n,0)}finally{globalThis.fetch=original;env.sql.close()}
});
test('Kakao redirect responses are rejected without following or forwarding credentials',async()=>{
 const env=setup(),s=await start(env),original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(_input:any,init:any)=>{calls++;assert.equal(init.redirect,'manual');return new Response(null,{status:302,headers:{Location:'https://other.example'}})};
 try{const r=await handleApi(req('/auth/kakao/callback?code=x&state='+s.state,'GET',undefined,s.cookie),env);assert.equal(r.headers.get('location'),'/register?error=provider');assert.equal(calls,1);assert.equal(env.sql.prepare('SELECT count(*) n FROM kakao_members').get().n,0)}finally{globalThis.fetch=original;env.sql.close()}
});

test('Kakao Sync signup records only verified provider agreements and keeps phone optional',async()=>{
 const env=setup(),original=globalThis.fetch;env.KAKAO_SYNC_ENABLED='true';
 const at='2026-11-10T00:00:00Z',terms='dfds-member-terms-v1',privacy='dfds-member-privacy-v1';
 let profileId=321,consentId=321,complete=true;
 globalThis.fetch=async(input:any,init:any)=>{
  const url=new URL(String(input));
  if(url.pathname==='/oauth/token')return Response.json({access_token:'test-token'});
  assert.equal(init.headers.Authorization,'Bearer test-token');
  if(url.pathname==='/v2/user/me')return Response.json({id:profileId,kakao_account:{phone_number_needs_agreement:true}});
  assert.equal(url.pathname,'/v2/user/service_terms');
  assert.equal(url.searchParams.get('tags'),terms+','+privacy);
  return Response.json({id:consentId,service_terms:[terms,...(complete?[privacy]:[])].map(tag=>({tag,required:true,agreed:true,agreed_at:at}))});
 };
 async function callback(){
  const s=await start(env);
  const r=await handleApi(req('/auth/kakao/callback?code=x&state='+s.state,'GET',undefined,s.cookie),env);
  assert.equal(r.headers.get('location'),'/register');
  const cookie=cookies(r),p=await handleApi(req('/auth/signup','GET',undefined,cookie),env);
  assert.equal(p.status,200);
  return {cookie,...await p.json() as any};
 }
 try{
  let p=await callback();assert.deepEqual(p.accepted,{terms:true,privacy:true});
  assert.equal((await join(env,p,{terms:false,privacy:false})).status,200);
  const rows=env.sql.prepare('SELECT tag,policy_version,agreed_at FROM kakao_member_term_consents ORDER BY tag').all().map((row:any)=>({...row}));
  assert.deepEqual(rows,[privacy,terms].map(tag=>({tag,policy_version:memberPolicy,agreed_at:at})));
  assert.equal(env.sql.prepare("SELECT phone_verified FROM kakao_members WHERE kakao_id='321'").get().phone_verified,0);
  profileId=322;consentId=322;complete=false;
  p=await callback();assert.deepEqual(p.accepted,{terms:true,privacy:false});
  assert.equal((await join(env,p,{terms:false,privacy:false,accepted:{privacy:true}})).status,400);
  assert.equal((await join(env,p,{terms:false,privacy:true})).status,200);
  profileId=323;consentId=999;
  p=await callback();assert.deepEqual(p.accepted,{terms:false,privacy:false});
  assert.equal((await join(env,p,{terms:false,privacy:false})).status,400);
  assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM kakao_member_term_consents').get().n,3);
 }finally{globalThis.fetch=original;env.sql.close()}
});
