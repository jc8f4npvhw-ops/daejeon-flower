import {env} from 'cloudflare:workers';
import {handleApi} from '../../../lib/server/router';
import type {Env} from '../../../lib/server/types';
export const dynamic='force-dynamic';
const run=(request:Request)=>handleApi(request,env as unknown as Env);
export {run as GET,run as POST,run as PUT,run as PATCH,run as DELETE,run as HEAD};
