import application from 'vinext/server/fetch-handler';
import { runDeliveryJobs } from './lib/server/delivery-notifications';
import type { Env } from './lib/server/types';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const response = await application.fetch(request, env, ctx);
    const path = new URL(request.url).pathname;
    if (response.ok && (request.method === 'PATCH' && /^\/api\/admin\/orders\/\d+\/status$/.test(path) ||
      request.method === 'POST' && /^\/api\/admin\/delivery-notifications\/[a-f0-9]+\/retry$/.test(path))) {
      ctx.waitUntil(runDeliveryJobs(env).catch(() => console.error('DELIVERY_JOB_FAILED')));
    }
    return response;
  },
  scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runDeliveryJobs(env).catch(() => console.error('DELIVERY_JOB_FAILED')));
  }
};
