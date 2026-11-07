import {Env,assert,body,json,constantEqual} from './types';
import {admin} from './auth';
import {anniversaryMember,koreanDate} from './anniversary-reminders';
import {hmac,normalizePhone} from './solapi';
export function couponConfigured(env:Env){return env.ANNIVERSARY_COUPONS_ENABLED==='true'&&env.SESSION_SECRET?.length>=32}
export async function couponBenefitReady(env:Env){if(!couponConfigured(env))return false;const s:any=await env.DB.prepare('SELECT enabled FROM anniversary_coupon_settings WHERE id=1').first();return !!s?.enabled}
export async function runAnniversaryCoupons(env:Env,now=new Date()){
 if(!couponConfigured(env))return;const hour=new Date(now.getTime()+9*3600000).getUTCHours();if(hour<10||hour>=18)return;
 const s:any=await env.DB.prepare('SELECT * FROM anniversary_coupon_settings WHERE id=1').first();if(!s?.enabled)return;
 const today=koreanDate(now),statements:D1PreparedStatement[]=[];
 for(let offset=-s.valid_days_after;offset<=3;offset++){
  const date=new Date(Date.parse(today+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10),year=+date.slice(0,4),month=+date.slice(5,7),day=+date.slice(8,10),leap=month===2&&day===28&&new Date(Date.UTC(year,2,0)).getUTCDate()===28;
  const expiry=new Date(Date.parse(date+'T00:00:00Z')+s.valid_days_after*86400000).toISOString().slice(0,10);
  statements.push(env.DB.prepare(`INSERT OR IGNORE INTO anniversary_coupons(id,customer_id,anniversary_id,label,occurrence_year,occurrence_date,issued_date,expires_date,amount) SELECT lower(hex(randomblob(32))),customer_id,id,label,?,?,?,?,2000 FROM anniversary_reminders WHERE deleted=0 AND NOT EXISTS(SELECT 1 FROM anniversary_reminder_starts z WHERE z.anniversary_id=anniversary_reminders.id AND z.starts_on>?) AND month=? AND (day=? OR (?=1 AND day=29))`).bind(year,date,today,expiry,today,month,day,+leap));
 }
 await env.DB.batch(statements);
}
export async function couponContext(env:Env,b:any,trustedCustomerId?:number){
 if(!b.couponId)return null;assert(couponConfigured(env)&&/^[a-f0-9]{64}$/.test(b.couponId),400,'쿠폰을 다시 확인해주세요.');let cid=trustedCustomerId;
 if(!cid){const p=String(b.couponProof||'').split('.'),expires=Number(p[1]);cid=Number(p[0]);assert(Number.isSafeInteger(cid)&&cid>0&&expires>Date.now()&&expires<=Date.now()+20*60000&&constantEqual(p[2]||'',await hmac(env.SESSION_SECRET,b.couponId+':'+cid+':'+expires)),403,'쿠폰 확인 시간이 지났습니다. 쿠폰을 다시 선택해주세요.')}
 const r:any=await env.DB.prepare('SELECT c.*,u.phone_normalized,s.enabled FROM anniversary_coupons c JOIN customers u ON u.id=c.customer_id JOIN anniversary_coupon_settings s ON s.id=1 WHERE c.id=? AND c.customer_id=?').bind(b.couponId,cid).first(),today=koreanDate();
 assert(r&&r.enabled&&r.issued_date<=today&&r.expires_date>=today&&normalizePhone(b.phone)&&normalizePhone(b.phone)===normalizePhone(r.phone_normalized),400,'등록한 주문자 연락처와 쿠폰 사용 가능 기간을 확인해주세요.');return {id:r.id,customerId:cid,amount:2000};
}
export async function couponApi(req:Request,env:Env,path:string):Promise<Response|null>{
 if(path==='/anniversaries/coupons'&&req.method==='GET'){
  const u=await anniversaryMember(req,env),expires=Date.now()+15*60000;
  const rows=await env.DB.prepare(`SELECT c.*,COALESCE((SELECT r.status FROM anniversary_coupon_redemptions r WHERE r.coupon_id=c.id AND r.status!='RELEASED' LIMIT 1),CASE WHEN c.expires_date<date('now','+9 hours') THEN 'EXPIRED' ELSE 'AVAILABLE' END) status FROM anniversary_coupons c WHERE c.customer_id=? ORDER BY c.issued_date DESC,c.id LIMIT 100`).bind(u.customer_id).all<any>();
  const ready=await couponBenefitReady(env);return json({ready,rows:await Promise.all(rows.results.map(async c=>({...c,proof:ready&&c.status==='AVAILABLE'?u.customer_id+'.'+expires+'.'+await hmac(env.SESSION_SECRET,c.id+':'+u.customer_id+':'+expires):null}))),terms:{amount:2000,perOrder:1,deliveryExcluded:true}});
 }
 if(path==='/admin/anniversary-coupons/settings'&&req.method==='PUT'){
  const user=await admin(req,env,['OWNER']),b=await body(req,1024);assert(typeof b.enabled==='boolean'&&Number.isInteger(b.validDays)&&b.validDays>=0&&b.validDays<=30,400,'쿠폰 사용 기간을 확인해주세요.');assert(!b.enabled||couponConfigured(env)&&b.confirm===true,409,'쿠폰 환경 설정과 결제 테스트를 완료해주세요.');
  await env.DB.batch([env.DB.prepare('UPDATE anniversary_coupon_settings SET enabled=?,valid_days_after=? WHERE id=1').bind(+b.enabled,b.validDays),env.DB.prepare("INSERT INTO admin_activity(admin_user_id,action,target_type,target_id) VALUES(?,'기념일 쿠폰 설정','anniversary_coupon',?)").bind(user.id,(b.enabled?'ON':'OFF')+' / '+b.validDays+'일')]);return json({ok:true});
 }
 return null;
}
export async function beginCouponPayment(env:Env,orderNo:string){
 const r:any=await env.DB.prepare('SELECT r.status,c.expires_date FROM anniversary_coupon_redemptions r JOIN anniversary_coupons c ON c.id=r.coupon_id WHERE r.order_no=?').bind(orderNo).first();if(!r)return;
 if(r.status==='RESERVED')assert(r.expires_date>=koreanDate(),409,'쿠폰 사용 기한이 지났습니다. 결제 준비를 취소하고 다시 주문해주세요.');
 assert(['RESERVED','VERIFYING','USED'].includes(r.status),409,'이 결제는 취소되었습니다.');await env.DB.prepare("UPDATE anniversary_coupon_redemptions SET status='VERIFYING',updated_at=CURRENT_TIMESTAMP WHERE order_no=? AND status='RESERVED' AND EXISTS(SELECT 1 FROM anniversary_coupons c WHERE c.id=anniversary_coupon_redemptions.coupon_id AND c.expires_date>=date('now','+9 hours'))").bind(orderNo).run();
 const current:any=await env.DB.prepare('SELECT status FROM anniversary_coupon_redemptions WHERE order_no=?').bind(orderNo).first();assert(['VERIFYING','USED'].includes(current?.status),409,'결제 상태가 바뀌었습니다. 다시 확인해주세요.');
}
