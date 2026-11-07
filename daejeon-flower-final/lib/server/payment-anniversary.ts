import {Env,HttpError,assert,body,json,hash,token,sameOrigin,constantEqual} from './types';
import {paymentSession} from './orders';
import {anniversaryMember,reminderPolicy} from './anniversary-reminders';
import {couponBenefitReady} from './anniversary-coupons';
import {normalizePhone} from './solapi';
import {loadContent} from './content';
import {kakaoLinks} from '../../src/frontend/kakao-channel';
export async function paymentAnniversaryInfo(env:Env){const [content,settings]:any[]=await Promise.all([loadContent(env),env.DB.prepare('SELECT valid_days_after FROM anniversary_coupon_settings WHERE id=1').first()]);return {couponReady:await couponBenefitReady(env),validDays:settings?.valid_days_after??7,channelUrl:kakaoLinks(content.settings.kakao||'').home,policyVersion:reminderPolicy}}
export async function paymentAnniversarySession(req:Request,env:Env){
 sameOrigin(req);assert(env.SESSION_SECRET?.length>=32,503,'보안 설정을 확인해주세요.');const b=await body(req,2048),session=await paymentSession(env,b.orderId,b.token);assert(session.payment_status==='PAID',409,'결제 완료 확인 후 기념일을 등록할 수 있습니다.');
 const order:any=await env.DB.prepare('SELECT id,customer_id,orderer_name,orderer_phone,fulfillment_at FROM orders WHERE order_no=?').bind(b.orderId).first();const phone=normalizePhone(order?.orderer_phone||'');assert(order&&phone,400,'주문자 연락처를 확인해주세요.');
 const info=await paymentAnniversaryInfo(env);let own:any=null;
 try{own=await anniversaryMember(new Request(req.url,{headers:req.headers}),env)}catch(e){if(!(e instanceof HttpError&&[401,403].includes(e.status)))throw e}
 if(own){const c:any=await env.DB.prepare('SELECT phone_normalized FROM customers WHERE id=?').bind(own.customer_id).first();if(phone===normalizePhone(c?.phone_normalized||'')){const preferences=await env.DB.prepare('SELECT marketing,channel_friend FROM anniversary_reminder_preferences WHERE customer_id=?').bind(own.customer_id).first();return json({...info,preferences:preferences||{marketing:0,channel_friend:0},csrf:own.csrf,suggestedDate:order.fulfillment_at?.slice(0,10)||null})}}
 const accessHash=await hash(String(b.token||''));let mapping:any=await env.DB.prepare('SELECT customer_id,access_hash FROM anniversary_payment_access WHERE order_id=?').bind(order.id).first();
 if(!mapping){
  // A payment proves access to this order, not ownership of another customer's phone number.
  // Never merge an existing profile merely because a guest entered that phone number.
  const existing=await env.DB.prepare('SELECT id FROM customers WHERE phone_normalized=?').bind(phone).first();assert(!existing&&!order.customer_id,409,'이미 등록된 연락처입니다. 기존 기념일 관리 링크로 접속한 뒤 다시 시도해주세요. 매장에서 새 관리 링크를 받을 수 있습니다.');
  const id=Number.parseInt(token().slice(0,12),16)+1;
  await env.DB.batch([env.DB.prepare('INSERT OR IGNORE INTO customers(id,name,phone_normalized) VALUES(?,?,?)').bind(id,order.orderer_name,phone),env.DB.prepare('INSERT OR IGNORE INTO anniversary_payment_access(order_id,customer_id,access_hash) SELECT ?,id,? FROM customers WHERE id=? AND phone_normalized=?').bind(order.id,accessHash,id,phone),env.DB.prepare('UPDATE orders SET customer_id=(SELECT customer_id FROM anniversary_payment_access WHERE order_id=orders.id) WHERE id=? AND customer_id IS NULL AND EXISTS(SELECT 1 FROM anniversary_payment_access WHERE order_id=orders.id)').bind(order.id)]);
  mapping=await env.DB.prepare('SELECT customer_id,access_hash FROM anniversary_payment_access WHERE order_id=?').bind(order.id).first();
 }
 assert(mapping&&constantEqual(mapping.access_hash,accessHash),409,'등록 권한을 다시 확인해주세요. 기존 관리 링크로 접속할 수 있습니다.');
 const raw=token();await env.DB.prepare("INSERT INTO anniversary_reminder_sessions(token_hash,customer_id,expires_at) VALUES(?,?,datetime('now','+30 days'))").bind(await hash(raw),mapping.customer_id).run();
 return json({...info,preferences:{marketing:0,channel_friend:0},csrf:await hash(raw+env.SESSION_SECRET),suggestedDate:order.fulfillment_at?.slice(0,10)||null},200,{'Set-Cookie':`__Host-dfds_anniversary=${raw}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=2592000`});
}
