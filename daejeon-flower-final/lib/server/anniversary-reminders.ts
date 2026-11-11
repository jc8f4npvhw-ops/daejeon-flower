import {loadContent} from './content';
import {kakaoLinks} from '../../src/frontend/kakao-channel';
import {couponBenefitReady,couponConfigured} from './anniversary-coupons';
import {Env,assert,body,json,hash,token,sameOrigin,constantEqual} from './types';
import {admin} from './auth';
import {configuredOrigin,normalizePhone,solapiRequest} from './solapi';
const cookie='__Host-dfds_anniversary';
export const reminderPolicy='anniversary-brand-v1-20261106';
export function koreanDate(now=new Date()){return new Date(now.getTime()+9*3600000).toISOString().slice(0,10)}
export function occurrence(month:number,day:number,year:number){return `${year}-${String(month).padStart(2,'0')}-${String(Math.min(day,new Date(Date.UTC(year,month,0)).getUTCDate())).padStart(2,'0')}`}
export function noticeDate(date:string){return new Date(Date.parse(date+'T00:00:00Z')-3*86400000).toISOString().slice(0,10)}
export function nextReminder(month:number,day:number,today=koreanDate()){let year=Number(today.slice(0,4));let date=occurrence(month,day,year);if(date<today)date=occurrence(month,day,++year);return {date,notice:noticeDate(date),year}}
function configured(env:Env){return env.ANNIVERSARY_SENDING_ENABLED==='true'&&env.KAKAO_SENDING_ENABLED==='true'&&!!env.SOLAPI_ANNIVERSARY_TEMPLATE_ID&&!!env.SOLAPI_CHANNEL_ID&&!!env.SOLAPI_API_KEY&&!!env.SOLAPI_API_SECRET&&!!configuredOrigin(env)&&env.SESSION_SECRET?.length>=32}
function mode(env:Env){return {ready:!!configured(env),live:env.ANNIVERSARY_LIVE_SEND_ENABLED==='true',templateConfigured:!!env.SOLAPI_ANNIVERSARY_TEMPLATE_ID,testPhoneConfigured:!!normalizePhone(env.KAKAO_TEST_PHONE||'')}}
export function anniversarySetup(env:Env){return [
 {key:'ANNIVERSARY_COUPONS_ENABLED',label:'쿠폰 서버 기능',ok:env.ANNIVERSARY_COUPONS_ENABLED==='true',action:'Cloudflare 텍스트 변수 ANNIVERSARY_COUPONS_ENABLED = true'},
 {key:'ANNIVERSARY_SENDING_ENABLED',label:'기념일 발송 서버 기능',ok:env.ANNIVERSARY_SENDING_ENABLED==='true',action:'기념일 전용 템플릿 준비 후 Cloudflare 텍스트 변수 ANNIVERSARY_SENDING_ENABLED = true'},
 {key:'KAKAO_SENDING_ENABLED',label:'카카오 발송 공통 설정',ok:env.KAKAO_SENDING_ENABLED==='true',action:'Cloudflare 텍스트 변수 KAKAO_SENDING_ENABLED = true'},
 {key:'SOLAPI_ANNIVERSARY_TEMPLATE_ID',label:'기념일 전용 메시지 템플릿',ok:!!env.SOLAPI_ANNIVERSARY_TEMPLATE_ID,action:'SOLAPI에서 기념일용 브랜드 메시지 템플릿을 준비하고 해당 ID를 같은 이름의 변수에 등록. 배송완료 템플릿과 별개'},
 {key:'SOLAPI_CHANNEL_ID',label:'SOLAPI 카카오 채널',ok:!!env.SOLAPI_CHANNEL_ID,action:'기존 SOLAPI 채널 ID 등록'},
 {key:'SOLAPI_API_KEY',label:'SOLAPI API 키',ok:!!env.SOLAPI_API_KEY,action:'Cloudflare 비밀에 등록. 값은 이 화면에 표시하지 않음'},
 {key:'SOLAPI_API_SECRET',label:'SOLAPI API 시크릿',ok:!!env.SOLAPI_API_SECRET,action:'Cloudflare 비밀에 등록. 값은 이 화면에 표시하지 않음'},
 {key:'PUBLIC_ORIGIN',label:'홈페이지 주소',ok:!!configuredOrigin(env),action:'Cloudflare PUBLIC_ORIGIN에 실제 HTTPS 홈페이지 주소 등록'},
 {key:'SESSION_SECRET',label:'세션 보안 설정',ok:!!env.SESSION_SECRET&&env.SESSION_SECRET.length>=32,action:'기존 32자 이상 SESSION_SECRET 유지. 새 값을 임의로 입력하지 않음'},
 {key:'KAKAO_TEST_PHONE',label:'본인 수신 테스트 번호',ok:!!normalizePhone(env.KAKAO_TEST_PHONE||''),action:'Cloudflare 비밀 KAKAO_TEST_PHONE에 본인 전화번호 등록'}
]}
const label=(v:unknown)=>typeof v==='string'?v.trim():'';
function clean(b:any){assert(b&&typeof b.label==='string'&&label(b.label).length>=1&&label(b.label).length<=40&&!/[\r\n<>]/.test(b.label),400,'기념일 이름은 1~40자로 입력해주세요.');assert(Number.isInteger(b.month)&&Number.isInteger(b.day)&&b.month>=1&&b.month<=12&&b.day>=1&&b.day<=new Date(Date.UTC(2000,b.month,0)).getUTCDate(),400,'유효한 월과 일을 선택해주세요.');assert(typeof b.notify==='boolean',400,'알림 신청 여부를 확인해주세요.');return {label:label(b.label),month:b.month,day:b.day,notify:b.notify?1:0}}
function detail(b:any){
 const relationship=b.relationship??null,occasion=b.occasion??null,memo=b.memo??'',startDate=b.startDate??b.start_date??null;
 assert(relationship===null||['가족','연인','배우자','소중한 사람'].includes(relationship),400,'관계를 선택해주세요.');
 assert(occasion===null||['생일','결혼기념일','사귄 날','기타'].includes(occasion),400,'기념일 종류를 선택해주세요.');
 assert(typeof memo==='string'&&memo.length<=300,400,'메모는 300자 이내로 입력해주세요.');
 if(startDate!==null&&startDate!==''){const d=new Date(startDate+'T00:00:00Z');assert(typeof startDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(startDate)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===startDate&&startDate>='1900-01-01'&&startDate<=koreanDate(),400,'처음 사귄 날짜를 확인해주세요.');assert(occasion==='사귄 날'&&+startDate.slice(5,7)===b.month&&+startDate.slice(8,10)===b.day,400,'사귄 날짜와 기념일을 확인해주세요.');}
 assert(occasion!=='사귄 날'||!!startDate,400,'처음 사귄 날짜를 선택해주세요.');return {relationship,occasion,memo:memo.trim(),startDate:startDate||null};
}
export async function anniversaryMember(req:Request,env:Env){const raw=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookie+'='))?.slice(cookie.length+1)||'';assert(/^[a-f0-9]{64}$/.test(raw),401,'매장에서 발급한 기념일 관리 링크로 접속해주세요.');const row:any=await env.DB.prepare('SELECT customer_id FROM anniversary_reminder_sessions WHERE token_hash=? AND expires_at>CURRENT_TIMESTAMP').bind(await hash(raw)).first();assert(row,401,'관리 권한이 만료되었습니다. 매장에 새 링크를 요청해주세요.');const csrf=await hash(raw+env.SESSION_SECRET);if(req.method!=='GET'){sameOrigin(req);assert(constantEqual(req.headers.get('x-csrf-token')||'',csrf),403,'관리 화면을 새로 열어주세요.')}return {...row,csrf}}
export async function anniversaryApi(req:Request,env:Env,path:string):Promise<Response|null>{
 if(path==='/anniversaries/exchange'&&req.method==='POST'){
  sameOrigin(req);assert(env.SESSION_SECRET?.length>=32,503,'보안 설정을 확인해주세요.');const b=await body(req,1024);assert(/^[a-f0-9]{64}$/.test(b.token||''),400,'관리 링크를 확인해주세요.');const digest=await hash(b.token),raw=token(),sessionHash=await hash(raw);
  // A single conditional INSERT consumes a grant atomically, including concurrent exchanges.
  const result=await env.DB.prepare("INSERT OR IGNORE INTO anniversary_reminder_sessions(token_hash,customer_id,expires_at) SELECT ?,customer_id,datetime('now','+30 days') FROM anniversary_reminder_grants WHERE token_hash=? AND consumed=0 AND expires_at>CURRENT_TIMESTAMP AND NOT EXISTS(SELECT 1 FROM anniversary_reminder_sessions WHERE token_hash=?)").bind(digest,digest,digest).run();
  assert(result.meta.changes===1,403,'이미 사용했거나 만료된 링크입니다. 매장에 새 링크를 요청해주세요.');
  await env.DB.batch([env.DB.prepare('UPDATE anniversary_reminder_sessions SET token_hash=? WHERE token_hash=?').bind(sessionHash,digest),env.DB.prepare('UPDATE anniversary_reminder_grants SET consumed=1 WHERE token_hash=?').bind(digest)]);
  return json({ok:true},200,{'Set-Cookie':`${cookie}=${raw}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=2592000`});
 }
 if(path==='/anniversaries'||path.startsWith('/anniversaries/')){
  const u=await anniversaryMember(req,env),cid=u.customer_id;
  if(path==='/anniversaries'&&req.method==='GET'){
   const [p,c,rows]:any[]=await Promise.all([env.DB.prepare('SELECT marketing,channel_friend FROM anniversary_reminder_preferences WHERE customer_id=?').bind(cid).first(),env.DB.prepare('SELECT name FROM customers WHERE id=?').bind(cid).first(),env.DB.prepare('SELECT id,label,month,day,notify,relationship,occasion,memo,start_date FROM anniversary_reminders WHERE customer_id=? AND deleted=0 ORDER BY month,day').bind(cid).all()]);
   return json({csrf:u.csrf,name:c?.name||'고객',preferences:p||{marketing:0,channel_friend:0},rows:rows.results,policyVersion:reminderPolicy,channelUrl:kakaoLinks((await loadContent(env)).settings.kakao||'').home,benefits:{anniversaryCouponReady:await couponBenefitReady(env),amount:2000},mode:mode(env)});
  }
  if(path==='/anniversaries/consent'&&req.method==='PUT'){
   const b=await body(req,1024);assert(typeof b.marketing==='boolean'&&typeof b.channelFriend==='boolean'&&b.policyVersion===reminderPolicy,400,'수신 설정 안내를 확인해주세요.');
   await env.DB.batch([env.DB.prepare('INSERT INTO anniversary_reminder_preferences(customer_id,marketing,channel_friend) VALUES(?,?,?) ON CONFLICT(customer_id) DO UPDATE SET marketing=excluded.marketing,channel_friend=excluded.channel_friend,revision=revision+1,updated_at=CURRENT_TIMESTAMP').bind(cid,+b.marketing,+b.channelFriend),env.DB.prepare('INSERT INTO anniversary_reminder_consents(customer_id,marketing,channel_friend,policy_version) VALUES(?,?,?,?)').bind(cid,+b.marketing,+b.channelFriend,reminderPolicy),env.DB.prepare("UPDATE anniversary_reminder_outbox SET status='CANCELLED',failure_code='CONSENT_CHANGED',updated_at=CURRENT_TIMESTAMP WHERE customer_id=? AND attempts=0 AND status='PENDING'").bind(cid)]);return json({ok:true});
  }
  if(path==='/anniversaries/logout'&&req.method==='POST'){await env.DB.prepare('DELETE FROM anniversary_reminder_sessions WHERE customer_id=?').bind(cid).run();return json({ok:true},200,{'Set-Cookie':`${cookie}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`})}
  const match=path.match(/^\/anniversaries\/([a-f0-9]{64})$/);
  if(path==='/anniversaries'&&req.method==='POST'){
   const input=await body(req,4096),b=clean(input),extra=detail(input);assert(input.requestId===undefined||/^[a-f0-9]{64}$/.test(input.requestId),400,'등록 요청 번호를 확인해주세요.');const id=input.requestId||token();const previous:any=await env.DB.prepare('SELECT * FROM anniversary_reminders WHERE id=?').bind(id).first();if(previous){assert(previous.customer_id===cid&&!previous.deleted&&previous.label===b.label&&previous.month===b.month&&previous.day===b.day&&previous.notify===b.notify&&(previous.relationship??null)===extra.relationship&&(previous.occasion??null)===extra.occasion&&(previous.memo||'')===extra.memo&&(previous.start_date??null)===extra.startDate,409,'등록한 내용을 확인해주세요.');return json({id},200)}const count:any=await env.DB.prepare('SELECT COUNT(*) n FROM anniversary_reminders WHERE customer_id=? AND deleted=0').bind(cid).first();assert(count.n<30,400,'기념일은 30개까지 등록할 수 있습니다.');
   let starts:string|null=null;
   if(input.fromPayment===true){const today=koreanDate();let year=Number(today.slice(0,4)),date=occurrence(b.month,b.day,year);if(noticeDate(date)<today)date=occurrence(b.month,b.day,year+1);starts=noticeDate(date)}
   const statements=[env.DB.prepare('INSERT INTO anniversary_reminders(id,customer_id,label,month,day,notify,relationship,occasion,memo,start_date) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,cid,b.label,b.month,b.day,b.notify,extra.relationship,extra.occasion,extra.memo,extra.startDate)];if(starts)statements.push(env.DB.prepare('INSERT INTO anniversary_reminder_starts(anniversary_id,starts_on) VALUES(?,?)').bind(id,starts));await env.DB.batch(statements);return json({id},201);
  }
  if(match&&['PUT','DELETE'].includes(req.method)){
   const row:any=await env.DB.prepare('SELECT id FROM anniversary_reminders WHERE id=? AND customer_id=? AND deleted=0').bind(match[1],cid).first();assert(row,404,'기념일을 찾지 못했습니다.');
   let update:D1PreparedStatement;
   if(req.method==='DELETE')update=env.DB.prepare('UPDATE anniversary_reminders SET deleted=1,notify=0,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND customer_id=?').bind(row.id,cid);
   else {const input=await body(req,4096),b=clean(input),extra=detail(input);update=env.DB.prepare('UPDATE anniversary_reminders SET label=?,month=?,day=?,notify=?,relationship=?,occasion=?,memo=?,start_date=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND customer_id=?').bind(b.label,b.month,b.day,b.notify,extra.relationship,extra.occasion,extra.memo,extra.startDate,row.id,cid)}
   await env.DB.batch([update,env.DB.prepare("UPDATE anniversary_reminder_outbox SET status='CANCELLED',failure_code='ANNIVERSARY_CHANGED',updated_at=CURRENT_TIMESTAMP WHERE anniversary_id=? AND attempts=0 AND status='PENDING'").bind(row.id)]);
   return json({ok:true});
  }
  return null;
 }
 if(path==='/admin/anniversary-reminders'||path.startsWith('/admin/anniversary-reminders/')){
  const u=await admin(req,env,['OWNER','MANAGER']);
  if(path.endsWith('/settings')&&req.method==='PUT'){assert(u.role==='OWNER',403,'운영자만 자동 발송을 설정할 수 있습니다.');const b=await body(req,1024);assert(typeof b.enabled==='boolean',400,'발송 설정을 확인해주세요.');assert(!b.enabled||configured(env)&&b.confirm===true,409,'발송 설정과 템플릿을 준비하고 테스트 후 활성화해주세요.');await env.DB.batch([env.DB.prepare('UPDATE anniversary_reminder_settings SET enabled=? WHERE id=1').bind(+b.enabled),env.DB.prepare("INSERT INTO admin_activity(admin_user_id,action,target_type,target_id) VALUES(?,'기념일 자동 발송 설정','anniversary',?)").bind(u.id,b.enabled?'ON':'OFF')]);return json({ok:true})}
  if(path.endsWith('/customer')&&req.method==='POST'){
   const b=await body(req,1024),name=label(b.name),phone=normalizePhone(b.phone||'');assert(name.length>=1&&name.length<=40&&phone&&b.confirm===true,400,'본인 확인과 정보 수집 안내 후 이름·연락처를 입력해주세요.');
   await env.DB.prepare('INSERT OR IGNORE INTO customers(name,phone_normalized) VALUES(?,?)').bind(name,phone).run();const c:any=await env.DB.prepare('SELECT id,name,phone_normalized FROM customers WHERE phone_normalized=?').bind(phone).first();await env.DB.prepare("INSERT INTO admin_activity(admin_user_id,action,target_type,target_id) VALUES(?,'기념일 관리용 고객 확인','customer',?)").bind(u.id,String(c.id)).run();return json({customer:c});
  }
  if(path.endsWith('/invite')&&req.method==='POST'){
   const b=await body(req,1024);assert(Number.isSafeInteger(b.customerId)&&b.customerId>0,400,'고객을 선택해주세요.');const c:any=await env.DB.prepare('SELECT id,name,phone_normalized FROM customers WHERE id=?').bind(b.customerId).first();assert(c&&normalizePhone(c.phone_normalized),400,'연락처가 등록된 기존 고객을 선택해주세요.');const origin=configuredOrigin(env);assert(origin,503,'홈페이지 주소 설정을 확인해주세요.');const raw=token();await env.DB.batch([env.DB.prepare('DELETE FROM anniversary_reminder_grants WHERE customer_id=?').bind(c.id),env.DB.prepare('DELETE FROM anniversary_reminder_sessions WHERE customer_id=?').bind(c.id),env.DB.prepare("INSERT INTO anniversary_reminder_grants(token_hash,customer_id,expires_at) VALUES(?,?,datetime('now','+7 days'))").bind(await hash(raw),c.id),env.DB.prepare("INSERT INTO admin_activity(admin_user_id,action,target_type,target_id) VALUES(?,'기념일 관리 링크 발급','customer',?)").bind(u.id,String(c.id))]);return json({link:origin+'/?moments=1#anniversary='+raw,name:c.name,expiresDays:7});
  }
  if(path==='/admin/anniversary-reminders'&&req.method==='GET'){
   const today=koreanDate(),page=Math.max(1,Math.min(100000,Number(new URL(req.url).searchParams.get('page'))||1));const settings=await env.DB.prepare('SELECT * FROM anniversary_reminder_settings WHERE id=1').first();
   const range=new URL(req.url).searchParams.get('range')||'7';assert(['today','7','all'].includes(range),400,'조회 범위를 확인해주세요.');
   const dates=Array.from({length:range==='today'?1:7},(_,i)=>new Date(Date.parse(today+'T00:00:00Z')+(i+3)*86400000).toISOString().slice(0,10));
   const parts:string[]=[],args:any[]=[];
   for(const date of dates){const y=+date.slice(0,4),m=+date.slice(5,7),d=+date.slice(8,10);parts.push('(a.month=? AND (a.day=? OR (?=1 AND a.day=29)))');args.push(m,d,+(m===2&&d===28&&new Date(Date.UTC(y,2,0)).getUTCDate()===28))}
   const where=' WHERE a.deleted=0'+(range==='all'?'':' AND ('+parts.join(' OR ')+')');if(range==='all')args.length=0;
   const rows=await env.DB.prepare('SELECT a.*,c.name customer_name,substr(c.phone_normalized,-4) phone_suffix,CASE WHEN c.phone_normalized IS NOT NULL AND length(c.phone_normalized)>=9 THEN 1 ELSE 0 END phone_ready,coalesce(p.marketing,0) marketing,coalesce(p.channel_friend,0) channel_friend FROM anniversary_reminders a JOIN customers c ON c.id=a.customer_id LEFT JOIN anniversary_reminder_preferences p ON p.customer_id=a.customer_id'+where+' ORDER BY a.month,a.day LIMIT 100 OFFSET ?').bind(...args,(Math.floor(page)-1)*100).all<any>();
   const logs=await env.DB.prepare('SELECT n.id,n.status,n.failure_code,n.due_date,n.updated_at,c.name customer_name,a.label FROM anniversary_reminder_outbox n JOIN customers c ON c.id=n.customer_id JOIN anniversary_reminders a ON a.id=n.anniversary_id ORDER BY n.updated_at DESC LIMIT 50').all();const count:any=await env.DB.prepare('SELECT COUNT(*) n FROM anniversary_reminders a'+where).bind(...args).first();
   const couponSettings=await env.DB.prepare('SELECT * FROM anniversary_coupon_settings WHERE id=1').first();const couponCounts=await env.DB.prepare("SELECT COUNT(*) issued,(SELECT COUNT(*) FROM anniversary_coupon_redemptions WHERE status='USED') used FROM anniversary_coupons").first();
   return json({setup:anniversarySetup(env),coupons:{settings:couponSettings,configured:!!couponConfigured(env),counts:couponCounts},today,page:Math.floor(page),total:count.n,settings,mode:mode(env),rows:rows.results.map(a=>({...a,...nextReminder(a.month,a.day,today)})).sort((a,b)=>a.notice.localeCompare(b.notice)),logs:logs.results});
  }
 }
 return null;
}

export function anniversaryPayload(env:Env,phone:string,name:string,date:string,eventId:string){
 assert(configured(env)&&normalizePhone(phone),503,'기념일 발송 설정을 확인해주세요.');
 return {allowDuplicates:false,showMessageList:true,messages:[{to:phone,country:'82',customFields:{anniversaryEventId:eventId},kakaoOptions:{pfId:env.SOLAPI_CHANNEL_ID,templateId:env.SOLAPI_ANNIVERSARY_TEMPLATE_ID,disableSms:true,variables:{'#{기념일명}':name,'#{기념일날짜}':date},bms:{targeting:'I'}}}]};
}
async function eventState(env:Env,id:string,status:string,code:string|null=null){await env.DB.prepare("UPDATE anniversary_reminder_outbox SET status=?,failure_code=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='SENDING'").bind(status,code,id).run()}
export async function runAnniversaryJobs(env:Env,now=new Date()){
 // A disabled installation must not depend on new tables having been migrated yet.
 if(!configured(env))return;
 await env.DB.prepare("UPDATE anniversary_reminder_outbox SET status='UNKNOWN',failure_code='INTERRUPTED_REQUEST',updated_at=CURRENT_TIMESTAMP WHERE status='SENDING' AND updated_at<datetime('now','-5 minutes')").run();
 const accepted=await env.DB.prepare("SELECT id,provider_group_id FROM anniversary_reminder_outbox WHERE status='ACCEPTED' AND provider_group_id IS NOT NULL ORDER BY updated_at LIMIT 10").all<any>();
 for(const row of accepted.results){try{const r=await solapiRequest(env,'/messages/v4/groups/'+row.provider_group_id);if(!r.ok)continue;const data:any=await r.json(),c=data.count;if(c?.total!==1||c.sentPending>0)continue;const status=c.sentSuccess===1&&c.sentFailed===0?'SENT':c.sentFailed===1&&c.sentSuccess===0?'FAILED':null;if(status)await env.DB.prepare("UPDATE anniversary_reminder_outbox SET status=?,failure_code=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='ACCEPTED'").bind(status,status==='FAILED'?'PROVIDER_DELIVERY_FAILED':null,row.id).run()}catch{}}
 const hour=new Date(now.getTime()+9*3600000).getUTCHours();if(hour<10||hour>=18)return;
 const settings:any=await env.DB.prepare('SELECT enabled FROM anniversary_reminder_settings WHERE id=1').first();if(!settings?.enabled)return;
 const today=koreanDate(now),target=new Date(Date.parse(today+'T00:00:00Z')+3*86400000).toISOString().slice(0,10),year=Number(target.slice(0,4)),month=Number(target.slice(5,7)),day=Number(target.slice(8,10));
 // Leap-day birthdays are observed on Feb 28 in non-leap years, consistently with the customer calendar.
 const leapFallback=month===2&&day===28&&new Date(Date.UTC(year,2,0)).getUTCDate()===28;
 await env.DB.prepare(`INSERT INTO anniversary_reminder_outbox(id,anniversary_id,customer_id,occurrence_year,due_date,revision,consent_revision,phone)
 SELECT lower(hex(randomblob(32))),a.id,a.customer_id,?,?,a.revision,p.revision,c.phone_normalized FROM anniversary_reminders a JOIN anniversary_reminder_preferences p ON p.customer_id=a.customer_id JOIN customers c ON c.id=a.customer_id
 WHERE a.deleted=0 AND NOT EXISTS(SELECT 1 FROM anniversary_reminder_starts z WHERE z.anniversary_id=a.id AND z.starts_on>?) AND a.notify=1 AND p.marketing=1 AND p.channel_friend=1 AND a.month=? AND (a.day=? OR (?=1 AND a.day=29))
 ON CONFLICT(anniversary_id,occurrence_year) DO UPDATE SET revision=excluded.revision,consent_revision=excluded.consent_revision,phone=excluded.phone,due_date=excluded.due_date,status='PENDING',failure_code=NULL,updated_at=CURRENT_TIMESTAMP
 WHERE anniversary_reminder_outbox.attempts=0 AND anniversary_reminder_outbox.status IN ('PENDING','CANCELLED')`).bind(year,today,today,month,day,+leapFallback).run();
 await env.DB.prepare('UPDATE anniversary_reminder_settings SET last_checked_at=? WHERE id=1').bind(now.toISOString()).run();
 await env.DB.prepare("UPDATE anniversary_reminder_outbox SET status='CANCELLED',failure_code='DUE_DATE_PASSED' WHERE status='PENDING' AND due_date<? AND attempts=0").bind(today).run();
 const rows=await env.DB.prepare("SELECT * FROM anniversary_reminder_outbox WHERE status='PENDING' AND due_date=? AND attempts=0 AND (?=1 OR replace(replace(phone,'-',''),' ','')=?) ORDER BY id LIMIT 10").bind(today,+(env.ANNIVERSARY_LIVE_SEND_ENABLED==='true'),normalizePhone(env.KAKAO_TEST_PHONE||'')).all<any>();
 for(const row of rows.results){
  const current:any=await env.DB.prepare('SELECT a.*,p.marketing,p.channel_friend,p.revision consent_revision,c.phone_normalized FROM anniversary_reminders a JOIN anniversary_reminder_preferences p ON p.customer_id=a.customer_id JOIN customers c ON c.id=a.customer_id WHERE a.id=?').bind(row.anniversary_id).first();
  const phone=normalizePhone(current?.phone_normalized||'');
  const eligible=current&&!current.deleted&&current.notify&&current.marketing&&current.channel_friend&&current.revision===row.revision&&current.consent_revision===row.consent_revision&&phone&&phone===normalizePhone(row.phone)&&noticeDate(occurrence(current.month,current.day,row.occurrence_year))===today;
  if(!eligible){await env.DB.prepare("UPDATE anniversary_reminder_outbox SET status='CANCELLED',failure_code='NO_LONGER_ELIGIBLE',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='PENDING'").bind(row.id).run();continue}
  if(env.ANNIVERSARY_LIVE_SEND_ENABLED!=='true'&&phone!==normalizePhone(env.KAKAO_TEST_PHONE||'')){
   await env.DB.prepare("UPDATE anniversary_reminder_outbox SET failure_code='TEST_RECIPIENT_ONLY' WHERE id=? AND status='PENDING'").bind(row.id).run();continue;
  }
  // Claim only while both the current subscription and its consent revision still match.
  const claimed=await env.DB.prepare(`UPDATE anniversary_reminder_outbox SET status='SENDING',attempts=1,failure_code=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='PENDING' AND attempts=0 AND EXISTS(SELECT 1 FROM anniversary_reminders a JOIN anniversary_reminder_preferences p ON p.customer_id=a.customer_id JOIN customers c ON c.id=a.customer_id JOIN anniversary_reminder_settings s ON s.id=1 WHERE a.id=anniversary_reminder_outbox.anniversary_id AND a.deleted=0 AND a.notify=1 AND a.revision=anniversary_reminder_outbox.revision AND p.marketing=1 AND p.channel_friend=1 AND p.revision=anniversary_reminder_outbox.consent_revision AND c.phone_normalized=anniversary_reminder_outbox.phone AND s.enabled=1)`).bind(row.id).run();
  if(claimed.meta.changes!==1)continue;
  try{
   const r=await solapiRequest(env,'/messages/v4/send-many/detail',anniversaryPayload(env,phone,current.label,occurrence(current.month,current.day,year),row.id));
   if(!r.ok){await eventState(env,row.id,r.status>=400&&r.status<500?'FAILED':'UNKNOWN','PROVIDER_HTTP_'+r.status);continue}
   const data:any=await r.json(),group=data.groupInfo?.groupId;
   if(data.failedMessageList?.length||data.groupInfo?.count?.registeredFailed===1){await eventState(env,row.id,'FAILED','PROVIDER_REJECTED');continue}
   if(!/^[A-Za-z0-9_-]{1,80}$/.test(group||'')||data.groupInfo?.count?.registeredSuccess!==1){await eventState(env,row.id,'UNKNOWN','UNCONFIRMED_RESPONSE');continue}
   await env.DB.prepare("UPDATE anniversary_reminder_outbox SET status='ACCEPTED',provider_group_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='SENDING'").bind(group,row.id).run();
  }catch{await eventState(env,row.id,'UNKNOWN','NETWORK_RESULT_UNKNOWN')}
 }
}
