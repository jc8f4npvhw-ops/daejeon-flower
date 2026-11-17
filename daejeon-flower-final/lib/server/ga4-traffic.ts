import {reports,type Report} from '../ga4-reports';
export type TrafficConfig={GA4_PROPERTY_ID?:string;GA4_SERVICE_ACCOUNT_JSON?:string};
const tokenUrl='https://oauth2.googleapis.com/token';
const enc=new TextEncoder();
const b64=(v:Uint8Array)=>btoa(String.fromCharCode(...v)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const encode=(o:unknown)=>b64(enc.encode(JSON.stringify(o)));
export async function readGa4Traffic(config:TrafficConfig,days:7|30|90,name:Report,request=fetch){
 const property=config.GA4_PROPERTY_ID?.trim();
 if(!property||!config.GA4_SERVICE_ACCOUNT_JSON)return null;
 if(!/^\d+$/.test(property))throw Error('Invalid property');
 const {client_email,private_key}=JSON.parse(config.GA4_SERVICE_ACCOUNT_JSON);
 if(typeof client_email!=='string'||typeof private_key!=='string')throw Error('Invalid credentials');
 const bytes=Uint8Array.from(atob(private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'')),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('pkcs8',bytes,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const iat=Math.floor(Date.now()/1000);
 const jwt=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:client_email,scope:'https://www.googleapis.com/auth/analytics.readonly',aud:tokenUrl,iat,exp:iat+3600});
 const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,enc.encode(jwt));
 const token=await request(tokenUrl,{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt+'.'+b64(new Uint8Array(signature))}),signal:AbortSignal.timeout(8000)});
 if(!token.ok)throw Error('Token request failed');
 const {access_token}=await token.json() as {access_token?:string};
 if(!access_token)throw Error('Missing access token');
 const [,dims,,mets]=reports[name],real=name==='realtime',summary=name==='daily'||real;
 type Row={dimensionValues?:{value:string}[];metricValues:{value:string}[]};
 type Result={rows?:Row[];rowCount?:number;metadata?:{subjectToThresholding?:boolean;dataLossFromOtherRow?:boolean}};
 const run=async(body:object)=>{
   const response=await request('https://analyticsdata.googleapis.com/v1beta/properties/'+property+(real?':runRealtimeReport':':runReport'),{
     method:'POST',headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},
     body:JSON.stringify({...(!real?{dateRanges:[{startDate:(days-1)+'daysAgo',endDate:'today'}]}:{}),...body}),signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error('Report request failed');
   return await response.json() as Result;
 };
 const metricList=mets.map(name=>({name}));
 const [detail,total]=await Promise.all([run({dimensions:dims.map(name=>({name})),metrics:metricList,limit:summary?90:50,
   orderBys:[summary?{dimension:{dimensionName:dims[0],orderType:'NUMERIC'},desc:!real}:{metric:{metricName:mets[0]},desc:true}]}),
   summary?run({metrics:metricList}):Promise.resolve(null)]);
 const values=(row:Row)=>{const nums=row.metricValues.map(v=>Number(v.value));if(nums.length!==mets.length||nums.some(v=>!Number.isFinite(v)||v<0))throw Error('Invalid metrics');return nums};
 return {rows:(detail.rows??[]).map(row=>({labels:row.dimensionValues?.map(v=>v.value)??[],values:values(row)})),
   rowCount:detail.rowCount??detail.rows?.length??0,
   limited:Boolean(detail.metadata?.subjectToThresholding||detail.metadata?.dataLossFromOtherRow||total?.metadata?.subjectToThresholding),
   summary:total?(total.rows?.[0]?values(total.rows[0]):mets.map(()=>0)):null};
}
