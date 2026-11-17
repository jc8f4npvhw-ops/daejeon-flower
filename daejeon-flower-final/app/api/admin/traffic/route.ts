import {env} from 'cloudflare:workers';
import {admin} from '../../../../lib/server/auth';
import {readGa4Traffic,type TrafficConfig} from '../../../../lib/server/ga4-traffic';
import {HttpError,json,type Env} from '../../../../lib/server/types';

export const dynamic='force-dynamic';

export async function GET(request:Request) {
 const config=env as unknown as Env & TrafficConfig;
 try {
   await admin(request,config,['OWNER','MANAGER']);
   const days=new URL(request.url).searchParams.get('days') ?? '7';
   if(days!=='7'&&days!=='30') return json({message:'조회 기간을 확인해주세요.'},400);
   const traffic=await readGa4Traffic(config,days==='30'?30:7);
   return json({traffic});
 } catch(error) {
   if(error instanceof HttpError) return json({message:error.message},error.status);
   return json({message:'GA4 통계를 불러오지 못했습니다. 잠시 후 다시 시도해주세요. 계속 실패하면 Google의 읽기 권한과 Cloudflare 설정을 확인해주세요.'},502);
 }
}
