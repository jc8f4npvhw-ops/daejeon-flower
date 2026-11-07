import {Env,assert,json,body,hash,token} from './types';
import {memberSession} from './kakao-login';
import {configuredOrigin} from './solapi';
import {nextReminder} from './anniversary-reminders';
const allowed=(env:Env,feature:string)=>feature==='calendar'?env.KAKAO_CALENDAR_ENABLED==='true':feature==='friends'?env.KAKAO_FRIENDS_ENABLED==='true':false;
async function key(env:Env){return crypto.subtle.importKey('raw',new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.SESSION_SECRET))),{name:'AES-GCM'},false,['encrypt','decrypt'])}
const hex=(b:Uint8Array)=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
const bytes=(s:string)=>new Uint8Array(s.match(/../g)!.map(x=>parseInt(x,16)));
export async function seal(env:Env,text:string,context:string){const iv=crypto.getRandomValues(new Uint8Array(12)),data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(context)},await key(env),new TextEncoder().encode(text));return hex(iv)+hex(new Uint8Array(data))}
export async function unseal(env:Env,text:string,context:string){return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(text.slice(0,24)),additionalData:new TextEncoder().encode(context)},await key(env),bytes(text.slice(24))))}
async function external(url:string,init:RequestInit){const r=await fetch(url,{...init,redirect:'manual',signal:AbortSignal.timeout(15000)});assert(r.ok,502,'카카오 기능을 완료하지 못했습니다. 권한과 연결 상태를 확인해주세요.');return await r.json() as any}
function back(error=false){return new Response(null,{status:303,headers:{Location:'/account'+(error?'?featureError=1':''),'Cache-Control':'no-store','Referrer-Policy':'no-referrer','Set-Cookie':'__Host-dfds_kakao_state=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0'}})}
export async function finishFeature(req:Request,env:Env,state:string){
 const row:any=await env.DB.prepare('SELECT * FROM kakao_feature_states WHERE state_hash=? AND consumed=0 AND expires_at>CURRENT_TIMESTAMP').bind(await hash(state)).first();assert(row&&allowed(env,row.feature),403,'추가 기능 연결 요청을 다시 시작해주세요.');
 const c=await env.DB.prepare('UPDATE kakao_feature_states SET consumed=1 WHERE state_hash=? AND consumed=0').bind(row.state_hash).run();assert(c.meta.changes===1,403,'이미 처리된 요청입니다.');
 const u=new URL(req.url);if(u.searchParams.has('error'))return back(true);
 try{
 const access=await external('https://kauth.kakao.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:env.KAKAO_REST_API_KEY!,client_secret:env.KAKAO_CLIENT_SECRET!,redirect_uri:configuredOrigin(env)+'/api/auth/kakao/callback',code:u.searchParams.get('code')||''})});
 assert(typeof access.access_token==='string'&&Number.isFinite(access.expires_in)&&access.expires_in>0,502,'추가 권한 연결을 다시 확인해주세요.');
 const p=await external('https://kapi.kakao.com/v2/user/me',{headers:{Authorization:'Bearer '+access.access_token}});
 const own:any=await env.DB.prepare('SELECT kakao_id FROM kakao_members WHERE customer_id=?').bind(row.customer_id).first();
 assert(own&&String(p.id)===own.kakao_id,403,'로그인한 카카오 계정과 같은 계정으로 연결해주세요.');
 const required=row.feature==='calendar'?['talk_calendar']:['friends','talk_message'];
 const scopes=await external('https://kapi.kakao.com/v2/user/scopes?scopes='+encodeURIComponent(JSON.stringify(required)),{headers:{Authorization:'Bearer '+access.access_token}});
 assert(required.every(id=>Array.isArray(scopes.scopes)&&scopes.scopes.some((s:any)=>s.id===id&&s.agreed===true)),403,'선택한 기능의 카카오 동의를 확인해주세요.');
 const expiry=new Date(Date.now()+Math.min(access.expires_in,3600)*1000).toISOString().replace('T',' ').slice(0,19);
 await env.DB.prepare('INSERT INTO kakao_feature_tokens(customer_id,feature,ciphertext,expires_at) VALUES(?,?,?,?) ON CONFLICT(customer_id,feature) DO UPDATE SET ciphertext=excluded.ciphertext,expires_at=excluded.expires_at').bind(row.customer_id,row.feature,await seal(env,access.access_token,row.customer_id+':'+row.feature),expiry).run();return back();
 }catch{return back(true)}
}
async function featureToken(env:Env,cid:number,feature:string){assert(allowed(env,feature),503,'이 기능은 카카오 권한 승인과 연결을 준비하고 있습니다.');const r:any=await env.DB.prepare('SELECT ciphertext FROM kakao_feature_tokens WHERE customer_id=? AND feature=? AND expires_at>CURRENT_TIMESTAMP').bind(cid,feature).first();assert(r,401,'먼저 카카오 기능을 연결해주세요.');try{return await unseal(env,r.ciphertext,cid+':'+feature)}catch{assert(false,401,'카카오 기능을 다시 연결해주세요.')}}
async function friends(env:Env,cid:number){const access=await featureToken(env,cid,'friends');const data=await external('https://kapi.kakao.com/v1/api/talk/friends?limit=100',{headers:{Authorization:'Bearer '+access}});return {access,rows:(Array.isArray(data.elements)?data.elements:[]).filter((x:any)=>typeof x.uuid==='string'&&typeof x.profile_nickname==='string').map((x:any)=>({uuid:x.uuid,name:x.profile_nickname.slice(0,80)}))}}
export async function kakaoFeatureApi(req:Request,env:Env,path:string):Promise<Response|null>{
 const s=await memberSession(req,env,req.method!=='GET'),cid=s.customer_id;
 if(path==='/auth/features'&&req.method==='GET'){const r:any=await env.DB.prepare('SELECT feature FROM kakao_feature_tokens WHERE customer_id=? AND expires_at>CURRENT_TIMESTAMP').bind(cid).all();const a:any=await env.DB.prepare('SELECT id,label,month,day FROM anniversary_reminders WHERE customer_id=? AND deleted=0 ORDER BY month,day').bind(cid).all();return json({csrf:s.csrf,calendarEnabled:allowed(env,'calendar'),friendsEnabled:allowed(env,'friends'),connected:r.results.map((x:any)=>x.feature),anniversaries:a.results})}
 if(path==='/auth/features/connect'&&req.method==='POST'){
  const b=await body(req,512);assert(allowed(env,b.feature),503,'추가 기능 권한을 준비하고 있습니다.');const base=configuredOrigin(env);assert(base&&new URL(req.url).origin===base,400,'대표 홈페이지에서 접속해주세요.');const state=token();await env.DB.prepare("INSERT INTO kakao_feature_states(state_hash,customer_id,feature,expires_at) VALUES(?,?,?,datetime('now','+10 minutes'))").bind(await hash(state),cid,b.feature).run();
  const u=new URL('https://kauth.kakao.com/oauth/authorize');u.searchParams.set('client_id',env.KAKAO_REST_API_KEY!);u.searchParams.set('redirect_uri',base+'/api/auth/kakao/callback');u.searchParams.set('response_type','code');u.searchParams.set('state',state);u.searchParams.set('scope',b.feature==='calendar'?'talk_calendar':'friends,talk_message');
  return json({url:u.href},200,{'Set-Cookie':'__Host-dfds_kakao_state='+state+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600'});
 }
 if(path==='/auth/features/friends'&&req.method==='GET')return json({rows:(await friends(env,cid)).rows});
 if(path==='/auth/features/disconnect'&&req.method==='POST'){const b=await body(req,512);assert(['calendar','friends'].includes(b.feature),400,'기능을 확인해주세요.');await env.DB.prepare('DELETE FROM kakao_feature_tokens WHERE customer_id=? AND feature=?').bind(cid,b.feature).run();return json({ok:true})}
 if((path==='/auth/features/calendar'||path==='/auth/features/message')&&req.method==='POST'){
  const b=await body(req,1024),feature=path.endsWith('/calendar')?'calendar':'friends';assert(b.confirm===true&&/^[a-f0-9]{64}$/.test(b.requestId||''),400,'실행 내용을 확인해주세요.');
  const access=await featureToken(env,cid,feature);let params:URLSearchParams,endpoint:string,actionKey:string;
  if(feature==='calendar'){
   const a:any=await env.DB.prepare('SELECT id,label,month,day FROM anniversary_reminders WHERE id=? AND customer_id=? AND deleted=0').bind(b.anniversaryId||'',cid).first();assert(a,404,'내 기념일을 선택해주세요.');const next=nextReminder(a.month,a.day),date=next.date;assert(date<'2051-01-01',400,'지원하는 날짜 범위를 확인해주세요.');
   // One upcoming occurrence, 10:00–10:30 KST. Private notes are never sent.
   const event={title:a.label,time:{start_at:date+'T01:00:00Z',end_at:date+'T01:30:00Z',time_zone:'Asia/Seoul',all_day:false,lunar:false},reminders:[4320],description:'대전꽃백화점에서 직접 저장한 기념일입니다.'};
   params=new URLSearchParams({calendar_id:'primary',event:JSON.stringify(event)});endpoint='https://kapi.kakao.com/v2/api/calendar/create/event';actionKey='calendar:'+a.id+':'+date;
  }else{
   const list=await friends(env,cid);assert(list.rows.some((x:any)=>x.uuid===b.recipient),403,'목록에 있는 친구를 선택해주세요.');
   const base=configuredOrigin(env);assert(base,503,'홈페이지 주소 설정을 확인해주세요.');params=new URLSearchParams({receiver_uuids:JSON.stringify([b.recipient]),template_object:JSON.stringify({object_type:'text',text:'함께 꽃 선물을 골라볼까요? 대전꽃백화점에서 꽃과 식물을 살펴보세요.',link:{web_url:base,mobile_web_url:base},button_title:'꽃 선물 둘러보기'})});endpoint='https://kapi.kakao.com/v1/api/talk/friends/message/default/send';actionKey='message:'+b.requestId;
  }
  const inserted=await env.DB.prepare("INSERT OR IGNORE INTO kakao_feature_actions(customer_id,action_key,feature,status) VALUES(?,?,?,'UNKNOWN')").bind(cid,actionKey,feature).run();
  if(inserted.meta.changes!==1){const previous:any=await env.DB.prepare('SELECT status FROM kakao_feature_actions WHERE customer_id=? AND action_key=?').bind(cid,actionKey).first();assert(previous?.status==='DONE',409,'처리 결과가 불확실합니다. 카카오에서 먼저 확인해주세요. 자동으로 다시 보내지 않습니다.');return json({ok:true,already:true})}
  let result:any;try{result=await external(endpoint,{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/x-www-form-urlencoded'},body:params});
   assert(feature==='calendar'?typeof result.event_id==='string':Array.isArray(result.successful_receiver_uuids)&&result.successful_receiver_uuids.includes(b.recipient),502,'카카오 처리 결과를 확인하지 못했습니다.');
  }catch{assert(false,502,'처리 결과가 확정되지 않았습니다. 카카오에서 확인해주세요. 같은 요청을 자동으로 재전송하지 않습니다.')}
  await env.DB.prepare("UPDATE kakao_feature_actions SET status='DONE',result_json=? WHERE customer_id=? AND action_key=?").bind(JSON.stringify(feature==='calendar'?{eventId:result.event_id}:{sent:true}),cid,actionKey).run();return json({ok:true});
 }
 return null;
}
