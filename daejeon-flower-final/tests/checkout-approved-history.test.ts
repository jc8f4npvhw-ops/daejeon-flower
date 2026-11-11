import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,passwordHash} from './helpers';
import {handleApi} from '../lib/server/router';
import {loadContent} from '../lib/server/content';
import {createCheckout,settle} from '../lib/server/orders';

test('an unapproved checkout is not an order in customer details, lists or direct admin detail',async()=>{
 const env=fixture();
 try{
  const content=await loadContent(env as any);
  Object.assign(content.settings,{paymentsEnabled:true,policiesConfirmed:true,privacy:'개인정보',terms:'약관',refund:'환불',orderPrivacy:'주문 안내'});
  env.sql.prepare("INSERT INTO content_blocks(block_key,payload_json) VALUES('STOREFRONT_V1',?)").run(JSON.stringify(content));
  env.sql.prepare("INSERT INTO admin_users(username,password_hash,display_name,role) VALUES('owner',?,'owner','OWNER')").run(await passwordHash('test-only-password'));
  env.sql.prepare("INSERT INTO customers(id,name,phone_normalized) VALUES(1,'테스트 고객','01012345678')").run();
  env.sql.prepare("INSERT INTO kakao_members(kakao_id,customer_id,contact_phone,phone_verified,terms_version) VALUES('1234',1,'01012345678',1,'v1')").run();
  const origin='https://store.example';
  const login=await handleApi(new Request(origin+'/api/admin/login',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({email:'owner',password:'test-only-password'})}),env as any);
  assert.equal(login.status,200);
  const get=(path:string)=>handleApi(new Request(origin+'/api'+path,{headers:{cookie:login.headers.get('set-cookie')!.split(';')[0]}}),env as any);
  const checkout=await createCheckout(env as any,{sku:{product:'꽃다발',style:'대전꽃백화점 스타일',size:'M'},mode:'픽업',name:'테스트 고객',phone:'01012345678',date:'2099-10-20',time:'10:00',privacy:true,termsAgreed:true,marketing:true,idempotencyKey:'test_payment_approval_v1'},origin,0,undefined,undefined,1);
  const link=new URL(checkout.redirectUrl);
  const no=link.searchParams.get('orderId')!;
  const order=env.sql.prepare('SELECT id,total_krw FROM orders WHERE order_no=?').get(no)!;
  const summary=await (await get('/payments/session?'+link.searchParams)).json() as any;
  assert.equal(summary.fulfillmentType,'PICKUP');
  assert.equal(summary.fulfillmentAt,'2099-10-20 10:00:00');
  const details=async()=>await (await get('/admin/customers/1')).json() as any;
  const count=async()=>((await (await get('/admin/customers?q=테스트')).json() as any).customers[0].order_count);
  assert.equal(await count(),0);
  assert.equal((await details()).orders.length,0);
  assert.equal((await get('/admin/reservations/'+order.id)).status,404);
  assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM anniversary_reminder_preferences').get()!.n,0);
  env.sql.prepare("UPDATE orders SET status='CANCELLED',payment_status='CANCELLED' WHERE id=?").run(order.id!);
  assert.equal((await details()).orders.length,0);
  env.sql.prepare("UPDATE orders SET status='PENDING_PAYMENT',payment_status='PENDING' WHERE id=?").run(order.id!);
  await settle(env as any,{orderId:no,paymentKey:'test-provider-approval',totalAmount:order.total_krw,status:'DONE',currency:'KRW',method:'카드',approvedAt:'2026-11-11T12:00:00+09:00'});
  assert.equal((await get('/admin/reservations/'+order.id)).status,200);
  assert.equal(await count(),1);
  assert.equal((await details()).orders[0].order_no,no);
  assert.equal((await details()).consents.find((x:any)=>x.consent_type==='MARKETING').is_agreed,1);
  assert.deepEqual({...env.sql.prepare('SELECT marketing,channel_friend FROM anniversary_reminder_preferences').get()},{marketing:1,channel_friend:0});
  env.sql.prepare("UPDATE orders SET status='CANCELLED',payment_status='REFUNDED' WHERE id=?").run(order.id!);
  assert.equal((await details()).orders.length,1);
 }finally{env.sql.close()}
});
