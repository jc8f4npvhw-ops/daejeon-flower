import {test} from 'node:test';import assert from 'node:assert/strict';import {fixture,passwordHash} from './helpers';import {handleApi} from '../lib/server/router';import {loadContent} from '../lib/server/content';
const origin='https://store.example';const req=(path:string,method='GET',body?:any,headers:any={})=>new Request(origin+'/api'+path,{method,headers:{origin,'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});
test('private payment UI amounts persist through authenticated content API and reject invalid prices without creating orders',async()=>{const env=fixture();try{
 env.sql.prepare('INSERT INTO admin_users(username,password_hash,display_name,role) VALUES(?,?,?,?)').run('owner',await passwordHash('correct-password-123'),'owner','OWNER');const login=await handleApi(req('/admin/login','POST',{email:'owner',password:'correct-password-123'}),env as any);const b:any=await login.json(),h={cookie:login.headers.get('set-cookie')!.split(';')[0],'X-CSRF-Token':b.csrf};let data:any=await loadContent(env as any);data.privatePayments=[{id:'pp_'+crypto.randomUUID(),title:'기업 꽃 주문',amount:150000,active:true,password:'flower2026'}];
 let r=await handleApi(req('/admin/content','PUT',{expectedRevision:data.revision,content:data},h),env as any);assert.equal(r.status,200,await r.clone().text());data=(await r.json() as any).content;r=await handleApi(req('/public/content'),env as any);const publicData:any=await r.json();assert.equal(publicData.privatePayments[0].amount,undefined);assert.equal(publicData.privatePayments[0].password,undefined);assert.equal(publicData.privatePayments[0].locked,true);const id=data.privatePayments[0].id;assert.equal(data.privatePayments[0].hasPassword,true);assert.equal(data.privatePayments[0].password,undefined);
assert(!JSON.stringify(await loadContent(env as any)).includes('flower2026'));assert(!JSON.stringify(env.sql.prepare('SELECT content_json FROM content_revisions').all()).includes('flower2026'));
assert.equal((await handleApi(req('/admin/content'),env as any)).status,401);
let access=await handleApi(req('/private-payments/'+id+'/unlock','POST',{password:'wrong'}),env as any);assert.equal(access.status,403);assert(!await access.clone().text().then(t=>t.includes('150000')));
access=await handleApi(req('/private-payments/'+id+'/unlock','POST',{password:'flower2026'}),env as any);assert.equal(access.status,200);assert.equal((await access.json() as any).entry.amount,150000);
const adminData=await handleApi(req('/admin/content','GET',undefined,h),env as any);assert.equal((await adminData.json() as any).privatePayments[0].amount,150000);
assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM orders').get()!.n,0);
 data.privatePayments[0].amount=-1;r=await handleApi(req('/admin/content','PUT',{expectedRevision:data.revision,content:data},h),env as any);assert.equal(r.status,400);data.privatePayments[0].amount=1.5;r=await handleApi(req('/admin/content','PUT',{expectedRevision:data.revision,content:data},h),env as any);assert.equal(r.status,400);assert.equal((await loadContent(env as any)).privatePayments[0].amount,150000);
 data=(await loadContent(env as any));data.privatePayments[0].password='newflower';r=await handleApi(req('/admin/content','PUT',{expectedRevision:data.revision,content:data},h),env as any);assert.equal(r.status,200);data=(await r.json() as any).content;
r=await handleApi(req('/private-payments/'+id+'/unlock','POST',{password:'flower2026'}),env as any);assert.equal(r.status,403);
r=await handleApi(req('/private-payments/'+id+'/unlock','POST',{password:'newflower'}),env as any);assert.equal(r.status,200);
for(let n=0;n<3;n++)r=await handleApi(req('/private-payments/'+id+'/unlock','POST',{password:'wrong'}),env as any);assert.equal(r.status,429);
data.privatePayments[0].active=false;r=await handleApi(req('/admin/content','PUT',{expectedRevision:data.revision,content:data},h),env as any);assert.equal(r.status,200);
r=await handleApi(req('/private-payments/'+id+'/unlock','POST',{password:'newflower'},{'cf-connecting-ip':'different'}),env as any);assert.equal(r.status,403);
 }finally{env.sql.close()}});

test('private pickup stays private and is retained after payment approval',async()=>{
 const env=fixture();
 try{
  const data=await loadContent(env as any),id='pp_'+crypto.randomUUID(),pickupAt='2099-11-21T15:30',password='123456';
  Object.assign(data.settings,{paymentsEnabled:true,policiesConfirmed:true,privacy:'개인정보',terms:'약관',refund:'환불',orderPrivacy:'주문 안내'});
  data.privatePayments=[{id,title:'픽업 꽃 주문',amount:52000,active:true,pickupAt}];
  env.sql.prepare("INSERT INTO content_blocks(block_key,payload_json) VALUES('STOREFRONT_V1',?)").run(JSON.stringify(data));
  env.sql.prepare('INSERT INTO private_payment_credentials(entry_id,password_hash) VALUES(?,?)').run(id,await passwordHash(password));
  const call=(path:string,method='GET',body?:any)=>handleApi(req(path,method,body),env as any);
  assert.equal((await (await call('/public/content')).json() as any).privatePayments[0].pickupAt,undefined);
  const unlocked=await call('/private-payments/'+id+'/unlock','POST',{password});
  assert.equal(unlocked.status,200,await unlocked.clone().text());
  const entry=(await unlocked.json() as any).entry;
  assert.equal(entry.pickupAt,pickupAt);
  const checkout=await call('/private-payments/'+id+'/checkout','POST',{proof:entry.checkoutProof,privacy:true,termsAgreed:true});
  assert.equal(checkout.status,201,await checkout.clone().text());
  const link=new URL((await checkout.json() as any).redirectUrl,origin);
  const summary=()=>call('/payments/session?'+link.searchParams).then(r=>r.json()) as Promise<any>;
  assert.equal((await summary()).fulfillmentAt,'2099-11-21 15:30:00');
  const {settle}=await import('../lib/server/orders');
  await settle(env as any,{orderId:link.searchParams.get('orderId'),paymentKey:'test-private-approval',totalAmount:52000,status:'DONE',currency:'KRW',method:'카드',approvedAt:'2026-11-11T12:00:00+09:00'});
  const paid=await summary();
  assert.equal(paid.status,'PAID');
  assert.equal(paid.fulfillmentAt,'2099-11-21 15:30:00');
 }finally{env.sql.close()}
});
