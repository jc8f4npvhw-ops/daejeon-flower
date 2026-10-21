import {Env,assert,body,json,sameOrigin,hash} from './types';
import {verifyPassword} from './auth';
export function publicContent(data:any){const reviewFeed=(data.reviewFeed||[]).filter((p:any)=>p.status==='published'&&p.privacyChecked===true&&p.permissionConfirmed===true);const allowed=new Set(reviewFeed.map((p:any)=>p.imageKey));const covers=Object.fromEntries(Object.entries(data.covers||{}).filter(([key,im]:any)=>!im?.src?.startsWith('/api/media/private/')&&(!key.startsWith('feed:')||allowed.has(key))));return {...data,covers,reviewFeed,privatePayments:(data.privatePayments||[]).filter((p:any)=>p.active).map((p:any)=>({id:p.id,title:p.title,active:true,locked:true}))}}

export async function privatePaymentUnlock(req:Request,env:Env,id:string,data:any){
 sameOrigin(req);const b=await body(req,2048);assert(typeof b.password==='string'&&b.password.length<=64,400,'비밀번호를 입력해주세요.');
 const key=await hash('private-payment:'+id+':'+(req.headers.get('cf-connecting-ip')||'local'));
 await env.DB.prepare("INSERT INTO security_login_attempts(attempt_key,attempts,reset_at) VALUES(?,1,datetime('now','+15 minutes')) ON CONFLICT(attempt_key) DO UPDATE SET attempts=CASE WHEN reset_at<CURRENT_TIMESTAMP THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<CURRENT_TIMESTAMP THEN datetime('now','+15 minutes') ELSE reset_at END").bind(key).run();
 const attempt:any=await env.DB.prepare('SELECT attempts FROM security_login_attempts WHERE attempt_key=?').bind(key).first();assert(attempt.attempts<=5,429,'입력 시도가 많습니다. 15분 후 다시 시도해주세요.');
 const entry=(data.privatePayments||[]).find((p:any)=>p.id===id&&p.active);
 const credential:any=await env.DB.prepare('SELECT password_hash FROM private_payment_credentials WHERE entry_id=?').bind(id).first();
 const valid=await verifyPassword(b.password,credential?.password_hash||'pbkdf2-sha256$100000$00112233445566778899aabbccddeeff$'+'0'.repeat(64));
 assert(entry&&credential&&valid,403,'비밀번호가 일치하지 않거나 이용할 수 없는 결제 항목입니다.');
 return json({entry:{id:entry.id,title:entry.title,amount:entry.amount,active:true}});
}
export async function adminPaymentContent(env:Env,data:any){const {results}=await env.DB.prepare('SELECT entry_id FROM private_payment_credentials').all();const ids=new Set(results.map((p:any)=>p.entry_id));return {...data,privatePayments:(data.privatePayments||[]).map((p:any)=>({id:p.id,title:p.title,amount:p.amount,active:p.active,hasPassword:ids.has(p.id)}))}}
