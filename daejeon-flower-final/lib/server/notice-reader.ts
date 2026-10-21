import {parseNoticeSite,DIRECT_NOTICE_HOSTS} from './notice-sites';
import {Env,assert,body,json,sameOrigin,hash,HttpError} from './types';
type Fetcher=(input:any,init?:any)=>Promise<Response>;
export function noticeURL(raw:string,hosts:string){let u:URL;try{u=new URL(raw)}catch{throw new HttpError(400,'올바른 https 링크를 입력해주세요.')}const host=u.hostname.toLowerCase(),allowed=hosts.split(',').map(h=>h.trim().toLowerCase()).filter(Boolean);
 assert(u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&!host.includes(':')&&!/^[\d.]+$/.test(host)&&host.includes('.')&&!host.endsWith('.local')&&!host.endsWith('.internal')&&host!=='localhost',400,'공개된 https 안내장 링크를 입력해주세요.');
 assert(allowed.includes(host),422,'아직 자동 읽기를 지원하지 않는 주소입니다. 안내장을 캡처해서 올리거나 직접 입력해주세요.');return u;
}
async function boundedText(r:Response,limit:number){assert(Number(r.headers.get('content-length')||0)<=limit,413,'안내장 내용이 너무 큽니다. 캡처를 사용해주세요.');const reader=r.body?.getReader();if(!reader)return '';const chunks:Uint8Array[]=[];let size=0;try{while(true){const v=await reader.read();if(v.done)break;size+=v.value.length;assert(size<=limit,413,'안내장 내용이 너무 큽니다. 캡처를 사용해주세요.');chunks.push(v.value)}}finally{await reader.cancel().catch(()=>{})}const bytes=new Uint8Array(size);let offset=0;for(const v of chunks){bytes.set(v,offset);offset+=v.length}return new TextDecoder().decode(bytes)}
async function noticePage(raw:string,env:Env,fetcher:Fetcher,signal:AbortSignal){let url=noticeURL(raw,env.NOTICE_ALLOWED_HOSTS?.trim()||DIRECT_NOTICE_HOSTS.join(','));for(let n=0;n<4;n++){const r=await fetcher(url.href,{redirect:'manual',signal,headers:{Accept:'text/html,application/xhtml+xml'}});if([301,302,303,307,308].includes(r.status)){const next=r.headers.get('location');await r.body?.cancel().catch(()=>{});assert(next&&n<3,422,'안내장 링크를 열지 못했습니다. 캡처를 사용해주세요.');url=noticeURL(new URL(next,url).href,env.NOTICE_ALLOWED_HOSTS?.trim()||DIRECT_NOTICE_HOSTS.join(','));continue}assert(r.ok,422,'안내장을 열지 못했습니다. 캡처를 사용해주세요.');assert(/text\/html|application\/xhtml\+xml/i.test(r.headers.get('content-type')||''),422,'안내장 웹페이지 링크를 입력하거나 캡처를 사용해주세요.');const html=await boundedText(r,500000);return {html,url:url.href}}throw new HttpError(422,'안내장 링크를 열지 못했습니다.')}
export async function readNotice(req:Request,env:Env,fetcher:Fetcher=fetch){
 sameOrigin(req);assert(env.NOTICE_READER_ENABLED==='true'&&env.SESSION_SECRET?.length>=32,503,'자동 읽기는 서버 연결 준비 중입니다. 아래 항목을 직접 입력해주세요.');
 const key=await hash('notice:'+env.SESSION_SECRET+':'+(req.headers.get('cf-connecting-ip')||'local'));
 await env.DB.prepare("INSERT INTO security_login_attempts(attempt_key,attempts,reset_at) VALUES(?,1,datetime('now','+15 minutes')) ON CONFLICT(attempt_key) DO UPDATE SET attempts=CASE WHEN reset_at<CURRENT_TIMESTAMP THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<CURRENT_TIMESTAMP THEN datetime('now','+15 minutes') ELSE reset_at END").bind(key).run();
 const attempts:any=await env.DB.prepare('SELECT attempts FROM security_login_attempts WHERE attempt_key=?').bind(key).first();assert(attempts.attempts<=10,429,'자동 읽기 요청이 많습니다. 잠시 후 다시 시도하거나 직접 입력해주세요.');
 const b=await body(req,8192);assert(['funeral','wedding'].includes(b.kind),400,'안내장 종류를 확인해주세요.');
 assert(b.method==='link',400,'캡처 사진은 브라우저에서 무료로 읽습니다. 사진을 다시 선택하거나 직접 입력해주세요.');
 assert(typeof b.url==='string'&&b.url.length<=2000,400,'안내장 링크를 확인해주세요.');
 try{const page=await noticePage(b.url,env,fetcher,AbortSignal.timeout(30000));const direct=parseNoticeSite(page.url,page.html,b.kind);assert(direct,422,'이 안내장 형식은 아직 지원하지 않습니다. 캡처를 올리거나 직접 입력해주세요.');return json(direct)}catch(e){if(e instanceof HttpError)throw e;throw new HttpError(503,'안내장 링크 연결이 지연됩니다. 캡처를 사용하거나 직접 입력해주세요.')}
}
