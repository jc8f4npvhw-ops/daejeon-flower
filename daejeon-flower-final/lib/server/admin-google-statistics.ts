import {admin} from './auth';
import {type Env, HttpError, json} from './types';

type AnalyticsEnv = Env & {GA4_PROPERTY_ID?:string; GA4_SERVICE_ACCOUNT_JSON?:string};
type Report = { rows?:Array<{dimensionValues?:Array<{value?:string}>;metricValues?:Array<{value?:string}>}>;
  metadata?:{subjectToThresholding?:boolean;timeZone?:string;dataLossFromOtherRow?:boolean} };
const tokenEndpoint='https://oauth2.googleapis.com/token';
const scope='https://www.googleapis.com/auth/analytics.readonly';
const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const encode=(v:unknown)=>b64(new TextEncoder().encode(JSON.stringify(v)));
let cachedToken:{id:string;value:string;expires:number;privateKey:string}|undefined;
let tokenRequest:{id:string;privateKey:string;promise:Promise<string>}|undefined;
const reports=new Map<string,{expires:number,promise:Promise<unknown>}>();
const endpoints=async (url:string,headers:Record<string,string>,body:string)=>{
  const response=await fetch(url,{method:'POST',headers,body,redirect:'manual',signal:AbortSignal.timeout(8000)});
  if(!response.ok){
    if(response.status===429)throw new HttpError(503,'구글 통계 조회 한도에 도달했어요. 잠시 후 다시 확인해 주세요.');
    if(url===tokenEndpoint||[401,403,404].includes(response.status))throw new HttpError(503,'구글 통계 연결을 확인해 주세요. 서비스 계정의 GA4 액세스 권한과 API 설정을 확인할 수 있어요.');
    throw new HttpError(502,'구글에서 통계를 가져오지 못했어요. 잠시 뒤 다시 확인해 주세요.');
  }
  return response.json();
};
async function readToken(config:{client_email:string;private_key:string}){
  if(cachedToken?.id===config.client_email&&cachedToken.privateKey===config.private_key&&cachedToken.expires>Date.now()+60000)return cachedToken.value;
  if(tokenRequest?.id===config.client_email&&tokenRequest.privateKey===config.private_key)return tokenRequest.promise;
  const promise=(async()=>{
    const keyText=config.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');
    const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(keyText),v=>v.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
    const now=Math.floor(Date.now()/1000);
    const assertion=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:config.client_email,scope,aud:tokenEndpoint,iat:now,exp:now+3300});
    const signed=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(assertion));
    const data=await endpoints(tokenEndpoint,{'Content-Type':'application/x-www-form-urlencoded'},new URLSearchParams({
      grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:assertion+'.'+b64(new Uint8Array(signed)),
    }).toString()) as {access_token?:string;expires_in?:number};
    if(!data.access_token)throw new HttpError(502,'구글 통계 인증 정보를 가져오지 못했어요.');
    cachedToken={id:config.client_email,privateKey:config.private_key,value:data.access_token,expires:Date.now()+Math.min(data.expires_in??300,3600)*1000};
    return cachedToken.value;
  })();
  tokenRequest={id:config.client_email,privateKey:config.private_key,promise};
  try{return await promise;}finally{if(tokenRequest?.promise===promise)tokenRequest=undefined;}
}
const number=(v:string|undefined)=>{const n=Number(v);return Number.isFinite(n)?n:0};
const rowValues=(r:Report|undefined)=>(r?.rows??[]).map(row=>({label:(row.dimensionValues?.[0]?.value??'').slice(0,240),values:(row.metricValues??[]).map(v=>number(v.value))}));
async function getReport(property:string,config:{client_email:string;private_key:string},days:number){
  const key=property+':'+config.client_email+':'+days;
  const found=reports.get(key);
  if(found&&found.expires>Date.now())return found.promise;
  if(reports.size>20)reports.clear();
  const promise=(async()=>{
    const token=await readToken(config);
    const base='https://analyticsdata.googleapis.com/v1beta/properties/'+property;
    const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
    const dateRanges=[{startDate:days===1?'today':(days-1)+'daysAgo',endDate:'today'}];
    const dimensions=(name:string)=>[{name}];
    const metrics=(...names:string[])=>names.map(name=>({name}));
    const query=(dimension:string,m:string[],limit=12,order=m[0])=>({
      dateRanges,dimensions:dimensions(dimension),metrics:metrics(...m),limit:String(limit),
      orderBys:[dimension==='date'?{dimension:{dimensionName:'date'}}:{metric:{metricName:order},desc:true}],
    });
    const totals={dateRanges,metrics:metrics('activeUsers','sessions','screenPageViews','engagementRate','averageSessionDuration')};
    const trend=query('date',['activeUsers','sessions','screenPageViews'],93);
    const groups=[
      query('sessionDefaultChannelGroup',['sessions','activeUsers','engagementRate']),
      query('sessionSourceMedium',['sessions','activeUsers','engagementRate']),
      query('pagePath',['screenPageViews','activeUsers']),
      query('deviceCategory',['sessions','activeUsers']),
      query('region',['activeUsers','sessions']),
      query('eventName',['eventCount','totalUsers']),
    ];
    const loadBatch=async (requests:unknown[])=>{
      const result=await endpoints(base+':batchRunReports',headers,JSON.stringify({requests})) as {reports?:Report[]};
      if(!Array.isArray(result.reports)||result.reports.length!==requests.length)throw new HttpError(502,'구글 보고서 응답이 완전하지 않아요.');
      return result.reports;
    };
    const [a,b,live]=await Promise.all([
      loadBatch([totals,trend,...groups.slice(0,3)]),
      loadBatch(groups.slice(3)),
      endpoints(base+':runRealtimeReport',headers,JSON.stringify({metrics:metrics('activeUsers')}))
        .then(r=>rowValues(r as Report)[0]?.values[0]??0).catch(()=>null),
    ]);
    return {property,days,realtime:live,timeZone:a[0]?.metadata?.timeZone??null,summary:rowValues(a[0])[0]?.values??[0,0,0,0,0],
      trend:rowValues(a[1]),channels:rowValues(a[2]),sources:rowValues(a[3]),pages:rowValues(a[4]),
      devices:rowValues(b[0]),regions:rowValues(b[1]),events:rowValues(b[2]),
      limited:[...a,...b].some(r=>r.metadata?.subjectToThresholding||r.metadata?.dataLossFromOtherRow),checkedAt:new Date().toISOString(),
    };
  })();
  reports.set(key,{expires:Date.now()+60000,promise});
  try{return await promise;}catch(e){if(reports.get(key)?.promise===promise)reports.delete(key);throw e;}
}
export async function googleStatistics(request:Request,env:AnalyticsEnv){
  try{
    await admin(request,env,['OWNER','MANAGER']);
    const property=env.GA4_PROPERTY_ID?.trim();
    if(!property||!/^\d{4,16}$/.test(property)||!env.GA4_SERVICE_ACCOUNT_JSON)throw new HttpError(503,'구글 통계 연결 설정이 아직 준비되지 않았어요.');
    let config:{client_email:string;private_key:string};
    try{config=JSON.parse(env.GA4_SERVICE_ACCOUNT_JSON);}catch{throw new HttpError(503,'구글 통계 서비스 계정 설정을 확인해 주세요.');}
    if(typeof config?.client_email!=='string'||typeof config?.private_key!=='string')throw new HttpError(503,'구글 통계 서비스 계정 설정을 확인해 주세요.');
    const days=Number(new URL(request.url).searchParams.get('days')??'7');
    if(![1,7,30,90].includes(days))throw new HttpError(400,'조회 기간을 다시 선택해 주세요.');
    return json(await getReport(property,config,days));
  }catch(e){
    return e instanceof HttpError?json({message:e.message},e.status):json({message:'구글 통계를 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.'},502);
  }
}
