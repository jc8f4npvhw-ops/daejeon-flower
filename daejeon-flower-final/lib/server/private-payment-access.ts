import {Env,assert,body,json,sameOrigin,hash} from './types';
import {verifyPassword} from './auth';
export function publicContent(data:any){const reviewFeed=(data.reviewFeed||[]).filter((p:any)=>p.status==='published'&&p.privacyChecked===true&&p.permissionConfirmed===true);const allowed=new Set(reviewFeed.map((p:any)=>p.imageKey));const covers=Object.fromEntries(Object.entries(data.covers||{}).filter(([key,im]:any)=>!im?.src?.startsWith('/api/media/private/')&&(!key.startsWith('feed:')||allowed.has(key))));return {...data,covers,reviewFeed,privatePayments:(data.privatePayments||[]).filter((p:any)=>p.active).map((p:any)=>({id:p.id,title:p.title,active:true,locked:true}))}}

export async function privatePaymentUnlock(req:Request,env:Env,id:string,data:any){
 sameOrigin(req);const b=await body(req,2048);assert(typeof b.password==='string'&&b.password.length>=4&&b.password.length<=64,400,'비밀번호를 입력해주세요.');
 const key=await hash('private-payment:'+id+':'+(req.headers.get('cf-connecting-ip')||'local'));
 await env.DB.prepare("INSERT INTO security_login_attempts(attempt_key,attempts,reset_at) VALUES(?,1,datetime('now','+15 minutes')) ON CONFLICT(attempt_key) DO UPDATE SET attempts=CASE WHEN reset_at<CURRENT_TIMESTAMP THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<CURRENT_TIMESTAMP THEN datetime('now','+15 minutes') ELSE reset_at END").bind(key).run();
 const attempt:any=await env.DB.prepare('SELECT attempts FROM security_login_attempts WHERE attempt_key=?').bind(key).first();assert(attempt.attempts<=5,429,'입력 시도가 많습니다. 15분 후 다시 시도해주세요.');
 const entry=(data.privatePayments||[]).find((p:any)=>p.id===id&&p.active);
 const credential:any=await env.DB.prepare('SELECT password_hash FROM private_payment_credentials WHERE entry_id=?').bind(id).first();
 const valid=await verifyPassword(b.password,credential?.password_hash||'pbkdf2-sha256$100000$00112233445566778899aabbccddeeff$'+'0'.repeat(64));
 assert(entry&&credential&&valid,403,'비밀번호가 일치하지 않거나 이용할 수 없는 결제 항목입니다.');
 const order=await privateOrder(env,id);
 const enabled=privatePaymentsEnabled(env,data);
 const expires=Date.now()+10*60*1000;
 const proof=enabled&&!order?.closed?expires+'.'+await unlockSignature(env,entry,credential.password_hash,expires):undefined;
 return json({entry:{id:entry.id,title:order?.title??entry.title,amount:order?.amount??entry.amount,active:true,checkoutProof:proof,closed:!!order?.closed,status:order?.status}});
}

const orderNo=(id:string)=>'PP_'+id.slice(3);
const privatePaymentsEnabled=(env:Env,data:any)=>!!(env.PAYMENTS_ENABLED==='true'&&env.TOSS_CLIENT_KEY&&env.TOSS_SECRET_KEY&&env.SESSION_SECRET&&data.settings?.paymentsEnabled===true&&data.settings?.policiesConfirmed===true&&['terms','refund','privacy','orderPrivacy'].every(k=>data.settings[k]?.trim()));
async function unlockSignature(env:Env,entry:any,passwordHash:string,expires:number){
 const encode=new TextEncoder();
 const key=await crypto.subtle.importKey('raw',encode.encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=await crypto.subtle.sign('HMAC',key,encode.encode(JSON.stringify(['private-payment',entry.id,entry.title,entry.amount,passwordHash,expires])));
 return Array.from(new Uint8Array(mac),n=>n.toString(16).padStart(2,'0')).join('');
}
async function privateOrder(env:Env,id:string){
 const row=await env.DB.prepare('SELECT o.status order_status,o.payment_status status,o.total_krw amount,i.product_name_snapshot title FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.order_no=?').bind(orderNo(id)).first<{order_status:string;status:string;amount:number;title:string}>();
 return row?{...row,closed:row.order_status!=='PENDING_PAYMENT'||row.status!=='PENDING'}:null;
}
export async function privatePaymentCheckout(req:Request,env:Env,id:string,data:any){
 sameOrigin(req);const b=await body(req,2048);
 assert(privatePaymentsEnabled(env,data),503,'온라인 결제를 사용할 수 없습니다. 매장에 문의해주세요.');
 assert(b.privacy===true&&b.termsAgreed===true,400,'결제에 필요한 두 항목에 동의해주세요.');
 const entry=(data.privatePayments||[]).find((p:any)=>p.id===id&&p.active);
 const credential=await env.DB.prepare('SELECT password_hash FROM private_payment_credentials WHERE entry_id=?').bind(id).first<{password_hash:string}>();
 const proof=typeof b.proof==='string'?b.proof.match(/^(\d{13})\.([a-f0-9]{64})$/):null;
 assert(entry&&credential&&proof&&Number(proof[1])>Date.now(),403,'결제 항목을 다시 선택하고 비밀번호를 입력해주세요.');
 const mac=await unlockSignature(env,entry,credential.password_hash,Number(proof[1]));
 let mismatch=0;for(let i=0;i<mac.length;i++)mismatch|=mac.charCodeAt(i)^proof[2].charCodeAt(i);
 assert(mismatch===0,403,'결제 항목이 변경되었습니다. 다시 열어주세요.');
 const no=orderNo(id),amount=entry.amount,title=entry.title;
 assert(Number.isSafeInteger(amount)&&amount>0&&amount<=10000000,400,'결제 금액을 확인해주세요.');
 const digest=await hash(JSON.stringify([id,title,amount]));
 const access=await hash('private-checkout:'+no+':'+env.SESSION_SECRET);
 const snapshot='cms-'+data.revision;
 const open=async()=>{
  const order=await privateOrder(env,id);
  if(!order)return false;
  assert(!order.closed,409,'이미 결제가 완료되었거나 종료된 항목입니다.');
  assert(order.amount===amount&&order.title===title,409,'결제 준비 후 항목이 변경되었습니다. 매장에 문의해주세요.');
  await env.DB.prepare("UPDATE checkout_requests SET expires_at=datetime('now','+24 hours') WHERE order_no=?").bind(no).run();
  return true;
 };
 if(!await open()){
  try{
   await env.DB.batch([
    env.DB.prepare("INSERT INTO orders(order_no,status,payment_status,fulfillment_type,orderer_name,orderer_phone,subtotal_krw,total_krw) VALUES(?,'PENDING_PAYMENT','PENDING','SERVICE','개인고객','',?,?)").bind(no,amount,amount),
    env.DB.prepare('INSERT INTO order_items(order_id,product_name_snapshot,unit_price_krw,line_total_krw) SELECT id,?,?,? FROM orders WHERE order_no=?').bind(title,amount,amount,no),
    env.DB.prepare("INSERT INTO payments(order_id,provider,provider_order_id,amount_krw) SELECT id,'TOSS',?,? FROM orders WHERE order_no=?").bind(no,amount,no),
    env.DB.prepare("INSERT INTO order_consents(order_id,consent_type,is_agreed,policy_version,evidence_json) SELECT id,'PRIVACY',1,?,? FROM orders WHERE order_no=?").bind(snapshot,JSON.stringify({termsAgreed:true,privacyAgreed:true,termsVersion:snapshot,recordedAt:new Date().toISOString(),policies:{terms:data.settings.terms,privacy:data.settings.privacy,orderPrivacy:data.settings.orderPrivacy,refund:data.settings.refund}}),no),
    env.DB.prepare("INSERT INTO checkout_requests(idempotency_key,request_hash,order_no,token_hash,expires_at) VALUES(?,?,?,?,datetime('now','+24 hours'))").bind('private_'+id,digest,no,await hash(access)),
    env.DB.prepare('INSERT INTO order_versions(order_id) SELECT id FROM orders WHERE order_no=?').bind(no),
   ]);
  }catch(e){if(!await open())throw e;}
 }
 return json({redirectUrl:'/payment?'+new URLSearchParams({orderId:no,token:access})},201);
}

export async function adminPaymentContent(env:Env,data:any){
 const [credentials,orders]=await Promise.all([
  env.DB.prepare('SELECT entry_id FROM private_payment_credentials').all<{entry_id:string}>(),
  env.DB.prepare("SELECT order_no,payment_status FROM orders WHERE order_no GLOB 'PP_*'").all<{order_no:string;payment_status:string}>(),
 ]);
 const ids=new Set(credentials.results.map(p=>p.entry_id)), statuses=new Map(orders.results.map(p=>[p.order_no,p.payment_status]));
 return {...data,privatePayments:(data.privatePayments||[]).map((p:any)=>({id:p.id,title:p.title,amount:p.amount,active:p.active,hasPassword:ids.has(p.id),paymentStatus:statuses.get(orderNo(p.id)),orderNo:statuses.has(orderNo(p.id))?orderNo(p.id):undefined}))};
}
