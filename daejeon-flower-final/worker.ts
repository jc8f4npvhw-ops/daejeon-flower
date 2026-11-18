import {runAnniversaryCoupons} from './lib/server/anniversary-coupons';
import {cleanupMemberAuth} from './lib/server/kakao-login';
import {runAnniversaryJobs} from './lib/server/anniversary-reminders';
import application from 'vinext/server/fetch-handler';
import { runDeliveryJobs } from './lib/server/delivery-notifications';
import type { Env } from './lib/server/types';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const response = await application.fetch(request, env, ctx);
    const path = new URL(request.url).pathname;
    // Temporary diagnosis: record presence only, never credentials or cookie values.
    const adminCookieName = '__Host-dfds_admin=';
    if (request.method === 'POST' && path === '/api/admin/login' && response.ok) {
      const headers = response.headers as Headers & {
        getSetCookie?: () => string[];
        getAll?: (name: string) => string[];
      };
      const setCookies = headers.getSetCookie?.() ?? headers.getAll?.('Set-Cookie') ?? [headers.get('Set-Cookie') ?? ''];
      console.info('ADMIN_SESSION_DIAG', {
        stage: 'login',
        status: response.status,
        hasAdminSetCookie: setCookies.some(value => value.trimStart().startsWith(adminCookieName)),
      });
    } else if (request.method === 'GET' && (path === '/api/admin/content' || path === '/api/admin/session') && response.status === 401) {
      const hasAdminCookie = (request.headers.get('cookie') ?? '').split(';')
        .some(value => {
          const cookie = value.trim();
          return cookie.startsWith(adminCookieName) && cookie.length > adminCookieName.length;
        });
      console.info('ADMIN_SESSION_DIAG', {
        stage: path.endsWith('/session') ? 'session' : 'content',
        status: response.status,
        hasAdminCookie,
        hasSessionSecret: Boolean(env.SESSION_SECRET),
      });
    }
    if (response.ok && (request.method === 'PATCH' && /^\/api\/admin\/orders\/\d+\/status$/.test(path) ||
      request.method === 'POST' && /^\/api\/admin\/delivery-notifications\/[a-f0-9]+\/retry$/.test(path))) {
      ctx.waitUntil(runDeliveryJobs(env).catch(() => console.error('DELIVERY_JOB_FAILED')));
    }
    return response;
  },
  scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(cleanupMemberAuth(env).catch(() => console.error('MEMBER_SESSION_CLEANUP_FAILED')));
    ctx.waitUntil(runAnniversaryCoupons(env).catch(() => console.error('ANNIVERSARY_COUPON_JOB_FAILED')));
    ctx.waitUntil(runAnniversaryJobs(env).catch(() => console.error('ANNIVERSARY_JOB_FAILED')));
    ctx.waitUntil(runDeliveryJobs(env).catch(() => console.error('DELIVERY_JOB_FAILED')));
  }
};
