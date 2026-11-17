import {env} from 'cloudflare:workers';
import {admin} from '../../../../lib/server/auth';
import {readGa4Traffic,type TrafficConfig} from '../../../../lib/server/ga4-traffic';
import {HttpError,json,type Env} from '../../../../lib/server/types';
import {reports,type Report} from '../../../../lib/ga4-reports';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const config=env as unknown as Env & TrafficConfig;
 try{
  await admin(req,config,['OWNER','MANAGER']);
  const params=new URL(req.url).searchParams;
  const days=Number(params.get('days')??7),report=params.get('report')??'daily';
  if((days!==7&&days!==30&&days!==90)||!Object.hasOwn(reports,report))return json({message:'조회 기간과 보고서를 확인해주세요.'},400);
  return json({traffic:await readGa4Traffic(config,days,report as Report)});
 }catch(e){
  if(e instanceof HttpError)return json({message:e.message},e.status);
  return json({message:'GA4 통계를 불러오지 못했습니다. 새로고침해 주세요. 계속 실패하면 Cloudflare 설정과 Google 조회 권한을 확인해주세요.'},502);
 }
}
