import {admin,verifyPassword} from './auth';
import {Env,assert,body,json,token} from './types';

export async function passwordHash(password:string){
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const result=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256);
 const hex=(v:Uint8Array)=>Array.from(v,x=>x.toString(16).padStart(2,'0')).join('');
 return `pbkdf2-sha256$100000$${hex(salt)}$${hex(new Uint8Array(result))}`;
}
function audit(env:Env,user:any,action:string,type:string,id:string|number){
 return env.DB.prepare('INSERT INTO admin_activity(admin_user_id,action,target_type,target_id) VALUES(?,?,?,?)').bind(user.id,action,type,String(id));
}
export async function adminWorkspace(req:Request,env:Env,path:string):Promise<Response|null>{
 if(path==='/admin/workspace'&&req.method==='GET'){
  const u=await admin(req,env);const url=new URL(req.url);
  const month=url.searchParams.get('month')||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7);
  assert(/^\d{4}-(0[1-9]|1[0-2])$/.test(month),400,'조회 월을 확인해주세요.');
  const queries=[
   'SELECT COUNT(*) total FROM customers',
   'SELECT a.*,c.name customer_name FROM anniversaries a JOIN customers c ON c.id=a.customer_id ORDER BY a.month,a.day LIMIT 1000',
   'SELECT id,order_id,customer_id,notification_type,channel,status,failure_reason,sent_at,created_at FROM notifications ORDER BY id DESC LIMIT 200',
   'SELECT closure_date,is_closed,reason FROM store_closures ORDER BY closure_date',
   "SELECT o.id,o.order_no,o.orderer_name customer_name,o.fulfillment_at,o.fulfillment_type,o.status,o.payment_status,o.total_krw,(SELECT group_concat(product_name_snapshot,', ') FROM order_items WHERE order_id=o.id) product_name FROM orders o WHERE o.fulfillment_at>=? AND o.fulfillment_at<datetime(?,'+1 month') ORDER BY o.fulfillment_at LIMIT 1000",
   "SELECT substr(datetime(COALESCE(p.approved_at,p.created_at),'+9 hours'),1,10) day,COUNT(DISTINCT o.id) orders,COALESCE(SUM(CASE WHEN p.status IN ('PAID','PARTIAL_REFUND') THEN p.amount_krw-p.cancelled_amount_krw ELSE 0 END),0) paid,COALESCE(SUM(p.cancelled_amount_krw),0) refunded FROM orders o JOIN payments p ON p.order_id=o.id WHERE p.status IN ('PAID','PARTIAL_REFUND','REFUNDED') AND datetime(COALESCE(p.approved_at,p.created_at),'+9 hours')>=? AND datetime(COALESCE(p.approved_at,p.created_at),'+9 hours')<datetime(?,'+1 month') GROUP BY substr(datetime(COALESCE(p.approved_at,p.created_at),'+9 hours'),1,10) ORDER BY day",
   "SELECT p.name_ko name,COUNT(*) orders,COALESCE(SUM(i.unit_price_krw+i.option_price_krw),0) amount FROM order_items i JOIN orders o ON o.id=i.order_id JOIN products p ON p.id=i.product_id WHERE o.payment_status='PAID' AND datetime(o.created_at,'+9 hours')>=? AND datetime(o.created_at,'+9 hours')<datetime(?,'+1 month') GROUP BY p.id ORDER BY amount DESC LIMIT 10",
   'SELECT a.id,a.action,a.target_type,a.target_id,a.created_at,u.display_name FROM admin_activity a LEFT JOIN admin_users u ON u.id=a.admin_user_id ORDER BY a.id DESC LIMIT 100'
  ];
  const start=month+'-01';const results=await Promise.all(queries.map((q,i)=>[4,5,6].includes(i)?env.DB.prepare(q).bind(start,start).all():env.DB.prepare(q).all()));
  return json({month,customerCount:Number((results[0].results[0] as any)?.total||0),customers:[],anniversaries:results[1].results,notifications:results[2].results,closures:results[3].results,reservations:results[4].results,daily:results[5].results,ranking:results[6].results,activity:results[7].results,role:u.role,integrations:{membership:false,kakaoSending:false,coupons:false}});
 }
 if(path==='/admin/customers'&&req.method==='GET'){
  await admin(req,env);const url=new URL(req.url),query=(url.searchParams.get('q')||'').trim().replace(/[\s-]/g,'');const raw=url.searchParams.get('page')||'1';
  assert(query.length<=100&&/^[1-9]\d{0,8}$/.test(raw),400,'검색어 또는 페이지를 확인해주세요.');
  const where=" WHERE instr(lower(replace(replace(COALESCE(c.name,''),' ',''),'-','')),lower(?))>0 OR instr(replace(replace(COALESCE(c.phone_normalized,''),' ',''),'-',''),?)>0";
  const count:any=await env.DB.prepare('SELECT COUNT(*) total FROM customers c'+where).bind(query,query).first();
  const total=Number(count.total),pages=Math.max(1,Math.ceil(total/10)),page=Math.min(Number(raw),pages);
  const rows=await env.DB.prepare("SELECT c.id,c.name,c.phone_normalized,c.email,c.created_at,c.kakao_user_id IS NOT NULL kakao_linked,(SELECT COUNT(*) FROM orders o WHERE o.customer_id=c.id) order_count,(SELECT COALESCE(SUM(CASE WHEN o.payment_status IN ('PAID','PARTIAL_REFUND') THEN o.total_krw ELSE 0 END),0) FROM orders o WHERE o.customer_id=c.id) paid_total FROM customers c"+where+' ORDER BY c.id DESC LIMIT 10 OFFSET ?').bind(query,query,(page-1)*10).all();
  return json({customers:rows.results,total,page,pages,pageSize:10});
 }
 let match=path.match(/^\/admin\/customers\/(\d+)$/);
 if(match&&req.method==='GET'){
  await admin(req,env);const id=Number(match[1]);
  const customer=await env.DB.prepare('SELECT id,name,phone_normalized,email,created_at,kakao_user_id IS NOT NULL kakao_linked FROM customers WHERE id=?').bind(id).first();assert(customer,404,'고객을 찾지 못했습니다.');
  const [notes,orders,consents]=await Promise.all([
   env.DB.prepare('SELECT note,updated_at FROM customer_admin_notes WHERE customer_id=?').bind(id).first(),
   env.DB.prepare('SELECT order_no,status,payment_status,total_krw,fulfillment_at,created_at FROM orders WHERE customer_id=? ORDER BY id DESC LIMIT 100').bind(id).all(),
   env.DB.prepare('SELECT oc.consent_type,oc.is_agreed,oc.policy_version,oc.agreed_at,o.order_no FROM order_consents oc JOIN orders o ON o.id=oc.order_id WHERE o.customer_id=? ORDER BY oc.id DESC LIMIT 100').bind(id).all()
  ]);return json({customer,notes,orders:orders.results,consents:consents.results});
 }
 if(match&&req.method==='PATCH'){
  const u=await admin(req,env);const b=await body(req,8192),id=Number(match[1]);assert(typeof b.note==='string'&&b.note.length<=2000,400,'고객 메모는 2,000자 이하로 입력해주세요.');
  assert(await env.DB.prepare('SELECT id FROM customers WHERE id=?').bind(id).first(),404,'고객을 찾지 못했습니다.');
  await env.DB.batch([env.DB.prepare('INSERT INTO customer_admin_notes(customer_id,note,updated_by) VALUES(?,?,?) ON CONFLICT(customer_id) DO UPDATE SET note=excluded.note,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP').bind(id,b.note,u.id),audit(env,u,'고객 메모 수정','customer',id)]);return json({ok:true});
 }
 if(path==='/admin/closures'&&req.method==='PUT'){
  const u=await admin(req,env),b=await body(req,4096);assert(typeof b.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(b.date)&&new Date(b.date+'T00:00:00Z').toISOString().slice(0,10)===b.date,400,'날짜를 확인해주세요.');assert(typeof b.closed==='boolean'&&typeof b.reason==='string'&&b.reason.length<=200,400,'휴무 안내를 확인해주세요.');
  await env.DB.batch([env.DB.prepare('INSERT INTO store_closures(closure_date,is_closed,reason) VALUES(?,?,?) ON CONFLICT(closure_date) DO UPDATE SET is_closed=excluded.is_closed,reason=excluded.reason').bind(b.date,b.closed?1:0,b.reason),audit(env,u,b.closed?'휴무 설정':'휴무 해제','closure',b.date)]);return json({ok:true});
 }
 if(path==='/admin/staff'&&req.method==='GET'){
  await admin(req,env,['OWNER']);const {results}=await env.DB.prepare('SELECT id,username,display_name,role,is_active,last_login_at FROM admin_users ORDER BY id').all();return json({staff:results});
 }
 if(path==='/admin/staff'&&req.method==='POST'){
  const u=await admin(req,env,['OWNER']),b=await body(req,4096);
  assert(typeof b.username==='string'&&/^[A-Za-z0-9_.@-]{3,80}$/.test(b.username),400,'아이디는 영문·숫자 3~80자로 입력해주세요.');
  assert(typeof b.displayName==='string'&&b.displayName.trim()&&b.displayName.length<=50&&['OWNER','MANAGER','DRIVER'].includes(b.role),400,'표시 이름과 권한을 확인해주세요.');
  assert(typeof b.password==='string'&&b.password.length>=12&&b.password.length<=128,400,'비밀번호는 12~128자로 입력해주세요.');
  assert(!await env.DB.prepare('SELECT id FROM admin_users WHERE username=?').bind(b.username).first(),409,'이미 사용 중인 아이디입니다.');
  await env.DB.batch([env.DB.prepare('INSERT INTO admin_users(username,password_hash,display_name,role) VALUES(?,?,?,?)').bind(b.username,await passwordHash(b.password),b.displayName.trim(),b.role),audit(env,u,'관리자 계정 추가','staff',b.username)]);return json({ok:true},201);
 }
 match=path.match(/^\/admin\/staff\/(\d+)$/);
 if(match&&req.method==='PATCH'){
  const u=await admin(req,env,['OWNER']),b=await body(req,4096),id=Number(match[1]);
  assert(['OWNER','MANAGER','DRIVER'].includes(b.role)&&typeof b.active==='boolean',400,'권한과 사용 상태를 확인해주세요.');
  assert(id!==u.id||b.role==='OWNER'&&b.active,400,'본인의 운영자 권한을 해제할 수 없습니다.');
  assert(await env.DB.prepare('SELECT id FROM admin_users WHERE id=?').bind(id).first(),404,'관리자를 찾지 못했습니다.');
  const statements=[env.DB.prepare('UPDATE admin_users SET role=?,is_active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(b.role,b.active?1:0,id)];
  if(b.password){assert(typeof b.password==='string'&&b.password.length>=12&&b.password.length<=128,400,'비밀번호는 12~128자로 입력해주세요.');if(id===u.id){const own:any=await env.DB.prepare('SELECT password_hash FROM admin_users WHERE id=?').bind(id).first();assert(typeof b.currentPassword==='string'&&await verifyPassword(b.currentPassword,own.password_hash),400,'현재 비밀번호를 확인해주세요.');}statements.push(env.DB.prepare('UPDATE admin_users SET password_hash=? WHERE id=?').bind(await passwordHash(b.password),id));}
  statements.push(env.DB.prepare('DELETE FROM admin_sessions WHERE admin_user_id=?').bind(id),audit(env,u,'관리자 권한·상태 변경','staff',id));await env.DB.batch(statements);return json({ok:true});
 }
 return null;
}
