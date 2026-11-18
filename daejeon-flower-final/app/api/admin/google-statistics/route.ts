import {env} from 'cloudflare:workers';
import {googleStatistics} from '../../../../lib/server/admin-google-statistics';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>googleStatistics(request,env as unknown as Parameters<typeof googleStatistics>[1]);
