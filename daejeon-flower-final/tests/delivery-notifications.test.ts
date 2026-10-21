import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,passwordHash} from './helpers';
import {handleApi} from '../lib/server/router';
import {runDeliveryJobs} from '../lib/server/delivery-notifications';
import {deliveryLink} from '../lib/server/delivery-access';
import {deliveryTemplate,deliveryChannel,hmac} from '../lib/server/solapi';

const origin='https://store.example';
const request=(path:string,method='GET',data?:any,headers:any={})=>new Request(origin+'/api'+path,{method,headers:{origin,'Content-Type':'application/json',...headers},...(data===undefined?{}:{body:JSON.stringify(data)})});
async function setup(){
 const env:any=fixture();Object.assign(env,{PUBLIC_ORIGIN:origin,SOLAPI_API_KEY:'test-only-key',SOLAPI_API_SECRET:'test-only-secret',KAKAO_SENDING_ENABLED:'true',KAKAO_LIVE_SEND_ENABLED:'false',KAKAO_TEST_PHONE:'01012345678'});
 env.sql.prepare("INSERT INTO admin_users(username,password_hash,display_name,role) VALUES(?,?,?,'OWNER')").run('owner',await passwordHash('password-for-tests'),'관리자');
 const login=await handleApi(request('/admin/login','POST',{email:'owner',password:'password-for-tests'}),env);
 const auth:any=await login.json();const headers={cookie:login.headers.get('set-cookie')!.split(';')[0],'X-CSRF-Token':auth.csrf};
 function seed(id:number,optin=1,phone='01012345678'){
  env.sql.prepare("INSERT INTO orders(id,order_no,status,payment_status,fulfillment_type,orderer_name,orderer_phone,kakao_updates_enabled,total_krw) VALUES(?,?,'IN_PRODUCTION','PAID','DELIVERY','비공개 고객',?,?,50000)").run(id,'DELIVERY-'+id,phone,optin);
  env.sql.prepare("INSERT INTO order_items(order_id,product_name_snapshot) VALUES(?,'꽃바구니 M')").run(id);
 }
 async function photo(id:number){return handleApi(request(`/admin/orders/${id}/photo`,'PUT',{image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j32kAAAAASUVORK5CYII='},headers),env)}
 async function complete(id:number,version=0){return handleApi(request(`/admin/orders/${id}/status`,'PATCH',{status:'DELIVERED',expectedVersion:version},headers),env)}
 return {env,headers,seed,photo,complete};
}

test('upload then complete atomically queues one opted-in orderer event; disabled consent and transaction failures never queue',async()=>{
 const {env,headers,seed,photo,complete}=await setup();try{
  seed(1);assert.equal((await complete(1)).status,400);assert.equal((await photo(1)).status,200);env.KAKAO_SENDING_ENABLED='false';assert.equal((await complete(1)).status,200);
  const row=env.sql.prepare('SELECT * FROM delivery_notification_outbox').get();assert.equal(row.status,'WAITING_SETUP');assert.equal(row.recipient_phone,'01012345678');
  assert.equal((await complete(1,1)).status,400);
  assert.equal((await handleApi(request('/admin/orders/1/status','PATCH',{status:'IN_PRODUCTION',expectedVersion:1},headers),env)).status,200);
  assert.equal((await complete(1,2)).status,200);assert.equal(env.sql.prepare('SELECT COUNT(*) AS n FROM delivery_notification_outbox').get().n,1);
  seed(2,0);await photo(2);assert.equal((await complete(2)).status,200);assert.equal(env.sql.prepare('SELECT COUNT(*) AS n FROM delivery_notification_outbox').get().n,1);
  seed(3);await photo(3);env.sql.exec("CREATE TRIGGER fail_delivery_queue BEFORE INSERT ON delivery_notification_outbox WHEN NEW.order_id=3 BEGIN SELECT RAISE(ABORT,'simulated queue failure'); END;");
  assert.equal((await complete(3)).status,500);assert.equal(env.sql.prepare('SELECT status FROM orders WHERE id=3').get().status,'IN_PRODUCTION');assert.equal(env.sql.prepare('SELECT COUNT(*) AS n FROM delivery_notification_outbox WHERE order_id=3').get().n,0);
 }finally{env.sql.close()}
});

test('concurrent dispatch sends once with HMAC and approved variables; acceptance is separate from delivery; private photos remain order-bound',async()=>{
 const {env,seed,photo,complete}=await setup();const originalFetch=globalThis.fetch;try{
  seed(1);seed(2);await photo(1);await photo(2);await complete(1);await complete(2);
  let sends=0;const links:string[]=[];
  globalThis.fetch=async(input:any,init:any)=>{
   if(init.method==='GET')return new Response(JSON.stringify({count:{total:1,sentSuccess:1,sentFailed:0,sentPending:0}}));
   sends++;assert.equal(String(input),'https://api.solapi.com/messages/v4/send-many/detail');assert.equal(init.redirect,'manual');
   const auth=Object.fromEntries(String(init.headers.Authorization).replace('HMAC-SHA256 ','').split(', ').map(x=>x.split('=')));
   assert.equal(auth.signature,await hmac(env.SOLAPI_API_SECRET,auth.date+auth.salt));assert.equal(auth.apiKey,env.SOLAPI_API_KEY);
   const payload=JSON.parse(init.body);assert.equal(payload.messages.length,1);const m=payload.messages[0];assert.equal(m.to,'01012345678');assert.equal(m.type,'ATA');assert.equal(m.kakaoOptions.disableSms,true);assert.equal(m.kakaoOptions.templateId,deliveryTemplate);assert.equal(m.kakaoOptions.pfId,deliveryChannel);
   const link='https://'+m.kakaoOptions.variables['#{확인링크}'];assert(!link.includes('https://https://'));links.push(link);
   return new Response(JSON.stringify({groupInfo:{groupId:'G_'+sends,count:{registeredSuccess:1,registeredFailed:0}},messageList:[{messageId:'M_'+sends,statusCode:'2000'}],failedMessageList:[]}));
  };
  await Promise.all([runDeliveryJobs(env),runDeliveryJobs(env)]);assert.equal(sends,2);
  assert.equal(env.sql.prepare("SELECT COUNT(*) AS n FROM delivery_notification_outbox WHERE status='ACCEPTED'").get().n,2);
  const url=new URL(links.find(l=>new URL(l).searchParams.get('order')==='DELIVERY-1')!);const token=new URLSearchParams(url.hash.slice(1)).get('access');
  let r=await handleApi(request('/delivery/DELIVERY-1'),env);assert.equal(r.status,403);
  r=await handleApi(request('/delivery/DELIVERY-1/session','POST',{token},{origin:'https://evil.example'}),env);assert.equal(r.status,403);
  r=await handleApi(request('/delivery/DELIVERY-1/session','POST',{token}),env);assert.equal(r.status,200);assert(r.headers.get('set-cookie')!.includes('HttpOnly'));
  const cookie=r.headers.get('set-cookie')!.split(';')[0];r=await handleApi(request('/delivery/DELIVERY-1','GET',undefined,{cookie}),env);assert.equal(r.status,200);const data:any=await r.json();assert(!JSON.stringify(data).includes('01012345678'));assert(!JSON.stringify(data).includes('비공개 고객'));assert(data.photos.length);
  r=await handleApi(request(data.photos[0].src.replace('/api',''),'GET',undefined,{cookie}),env);assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'private, no-store');assert.equal(r.headers.get('Referrer-Policy'),'no-referrer');
  assert.equal((await handleApi(request('/delivery/DELIVERY-2','GET',undefined,{cookie}),env)).status,403);
  const privatePhoto=env.sql.prepare('SELECT r2_key FROM media LIMIT 1').get().r2_key;assert.equal((await handleApi(request('/media/'+privatePhoto),env)).status,401);
  env.sql.prepare("UPDATE orders SET status='IN_PRODUCTION' WHERE id=1").run();assert.equal((await handleApi(request(data.photos[0].src.replace('/api',''),'GET',undefined,{cookie}),env)).status,404);
  await runDeliveryJobs(env);assert.equal(sends,2);assert.equal(env.sql.prepare("SELECT COUNT(*) AS n FROM delivery_notification_outbox WHERE status='SENT'").get().n,2);
 }finally{globalThis.fetch=originalFetch;env.sql.close()}
});

test('network ambiguity is never automatically or manually resent; test whitelist and disabled sending block external calls',async()=>{
 const {env,headers,seed,photo,complete}=await setup();const originalFetch=globalThis.fetch;try{
  seed(1);await photo(1);await complete(1);let sends=0;globalThis.fetch=async()=>{sends++;throw Error('network drop after possible acceptance')};
  env.KAKAO_TEST_PHONE='01099999999';await runDeliveryJobs(env);assert.equal(sends,0);
  env.KAKAO_TEST_PHONE='01012345678';env.KAKAO_SENDING_ENABLED='false';await runDeliveryJobs(env);assert.equal(sends,0);
  env.KAKAO_SENDING_ENABLED='true';await runDeliveryJobs(env);await runDeliveryJobs(env);assert.equal(sends,1);
  const row=env.sql.prepare('SELECT * FROM delivery_notification_outbox').get();assert.equal(row.status,'UNKNOWN');
  assert.equal((await handleApi(request('/admin/delivery-notifications/'+row.id+'/retry','POST',{confirm:true},headers),env)).status,409);
  let r=await handleApi(request('/admin/delivery-notifications'),env);assert.equal(r.status,401);
  r=await handleApi(request('/admin/delivery-notifications','GET',undefined,headers),env);assert.equal(r.status,200);const text=await r.text();assert(!text.includes('test-only-secret'));assert(!text.includes('01012345678'));assert(text.includes('UNKNOWN'));
 }finally{globalThis.fetch=originalFetch;env.sql.close()}
});

test('explicit provider rejection can retry after confirmation; reopened/expired orders cancel before send; photo grants expire',async()=>{
 const {env,headers,seed,photo,complete}=await setup();const originalFetch=globalThis.fetch;try{
  seed(1);await photo(1);await complete(1);let sends=0;globalThis.fetch=async()=>{sends++;return new Response(JSON.stringify({errorCode:'InvalidAPIKey'}),{status:403})};
  await runDeliveryJobs(env);const row=env.sql.prepare('SELECT * FROM delivery_notification_outbox').get();assert.equal(row.status,'FAILED');
  assert.equal((await handleApi(request('/admin/delivery-notifications/'+row.id+'/retry','POST',{confirm:true},{cookie:headers.cookie}),env)).status,403);
  assert.equal((await handleApi(request('/admin/delivery-notifications/'+row.id+'/retry','POST',{confirm:true},headers),env)).status,200);
  env.sql.prepare("UPDATE orders SET status='IN_PRODUCTION' WHERE id=1").run();await runDeliveryJobs(env);assert.equal(sends,1);assert.equal(env.sql.prepare('SELECT status FROM delivery_notification_outbox').get().status,'CANCELLED');
  env.sql.prepare("UPDATE orders SET status='DELIVERED' WHERE id=1").run();const link=await deliveryLink(env,{id:1,order_no:'DELIVERY-1'});const token=new URLSearchParams(new URL(link).hash.slice(1)).get('access');env.sql.prepare("UPDATE delivery_photo_access SET expires_at=datetime('now','-1 day')").run();
  assert.equal((await handleApi(request('/delivery/DELIVERY-1/session','POST',{token}),env)).status,404);
 }finally{globalThis.fetch=originalFetch;env.sql.close()}
});
