// splatoon3.ink updater Worker: runs the shared app/ updaters and social posters on a schedule.
// See workers/updater/README.md.

import { instrumentDurableObjectWithSentry, withSentry } from '@sentry/cloudflare';
import * as Sentry from '@sentry/core';
import { LANES, Scheduler as SchedulerClass } from './Scheduler.mjs';
import { RegionAuth as RegionAuthClass } from './RegionAuth.mjs';
import { REGIONS, setupRuntime } from './runtime.mjs';
import { adminRequest } from './admin/routes.mjs';

// Sentry: the shared app/ code reports through @sentry/core, which lands on the client these
// wrappers set up for each request, alarm and RPC call. Without a SENTRY_DSN secret nothing is
// sent.
const sentryOptions = env => ({ dsn: env.SENTRY_DSN, environment: env.ENVIRONMENT, tracesSampleRate: 0 });
// Durable Object RPC methods (a renewal started from the admin panel, say) run without a Sentry
// client unless they are wrapped, and their events are silently dropped. instrumentPrototypeMethods
// wraps every one. Its replacement, enableRpcTracePropagation, only wraps calls that carry trace
// data from an instrumented caller, which ours do not. It is deprecated: check this when
// upgrading @sentry/cloudflare to a new major version.
const durableObjectSentryOptions = env => ({ ...sentryOptions(env), instrumentPrototypeMethods: true });

export const Scheduler = instrumentDurableObjectWithSentry(durableObjectSentryOptions, SchedulerClass);
export const RegionAuth = instrumentDurableObjectWithSentry(durableObjectSentryOptions, RegionAuthClass);

const LANE_NAMES = Object.keys(LANES);

function scheduler(env, lane) {
  return env.SCHEDULER.getByName(lane);
}

function regionAuth(env, region) {
  return env.REGION_AUTH.getByName(region);
}

function timingSafeEqual(a, b) {
  let encoder = new TextEncoder();
  let left = encoder.encode(a);
  let right = encoder.encode(b);

  return left.byteLength === right.byteLength && crypto.subtle.timingSafeEqual(left, right);
}

function authorized(request, env) {
  if (!env.RUN_TOKEN) {
    return false;
  }

  let [scheme, token] = (request.headers.get('Authorization') ?? '').split(' ');

  return scheme === 'Bearer' && !!token && timingSafeEqual(token, env.RUN_TOKEN);
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

// "true" and "false" as booleans, a missing parameter as undefined; anything else is passed on
// as is, for the scheduler to reject.
function flag(value) {
  return value === null ? undefined : { true: true, false: false }[value] ?? value;
}

function lanesFrom(url) {
  let lane = url.searchParams.get('lane') ?? 'all';

  if (lane === 'all') return LANE_NAMES;
  if (LANE_NAMES.includes(lane)) return [lane];

  return null;
}

async function armAll(env) {
  return {
    lanes: await Promise.all(LANE_NAMES.map(lane => scheduler(env, lane).ensureArmed({ lane }))),
    auth: await Promise.all(REGIONS.map(region => regionAuth(env, region).ensureArmed({ region }))),
  };
}

async function control(request, env) {
  let url = new URL(request.url);
  let route = `${request.method} ${url.pathname}`;

  switch (route) {
    case 'GET /status':
      return json({
        lanes: Object.fromEntries(await Promise.all(
          LANE_NAMES.map(async lane => [lane, await scheduler(env, lane).status()]),
        )),
        auth: Object.fromEntries(await Promise.all(
          REGIONS.map(async region => [region, await regionAuth(env, region).status()]),
        )),
      });

    case 'POST /run': {
      let lane = url.searchParams.get('lane') ?? 'fast';

      if (!LANE_NAMES.includes(lane)) {
        return json({ ok: false, error: `lane must be one of ${LANE_NAMES.join(', ')}` }, 400);
      }

      let result = await scheduler(env, lane).startManual({
        lane,
        // Fast lane only: translations=false for a quick run.
        translations: flag(url.searchParams.get('translations')),
        social: url.searchParams.get('social') !== 'false',
      });

      return json(result, result.ok ? 202 : result.busy ? 409 : 400);
    }

    case 'POST /schedule': {
      let lanes = lanesFrom(url);

      if (!lanes) {
        return json({ ok: false, error: `lane must be all or one of ${LANE_NAMES.join(', ')}` }, 400);
      }

      let enabled = url.searchParams.get('enabled') === 'true';
      let results = await Promise.all(lanes.map(lane => scheduler(env, lane).setAutomaticScheduling({ lane, enabled })));

      return json({ ok: results.every(result => result.ok), results }, results.some(result => result.busy) ? 409 : 200);
    }

    // Send one test event from this Worker and one from a Durable Object (where the shared code
    // runs), to check SENTRY_DSN after setting it.
    case 'POST /sentry-test': {
      let message = `Sentry test from the ${env.ENVIRONMENT ?? 'unknown'} updater`;
      let worker = Sentry.captureException(new Error(`${message} (Worker)`));
      let durableObject = await scheduler(env, 'fast').sentryTest({ message: `${message} (Durable Object)` });

      return json({ ok: true, sent: !!env.SENTRY_DSN, eventIds: { worker, durableObject } });
    }

    case 'POST /auth/refresh': {
      let region = url.searchParams.get('region');

      if (!REGIONS.includes(region)) {
        return json({ ok: false, error: `region must be one of ${REGIONS.join(', ')}` }, 400);
      }

      await regionAuth(env, region).refresh({ region });

      return json({ ok: true, ...(await regionAuth(env, region).status()) });
    }

    case 'POST /arm':
      return json({ ok: true, ...(await armAll(env)) });

    default:
      return json({ ok: false, error: 'Not found' }, 404);
  }
}

export default withSentry(sentryOptions, {
  // Watchdog: alarms do the work; this only re-arms anything missing. Lanes with scheduling
  // off stay that way.
  async scheduled(controller, env) {
    setupRuntime(env);
    console.info(JSON.stringify({ event: 'watchdog', cron: controller.cron, ...(await armAll(env)) }));
  },

  async fetch(request, env) {
    setupRuntime(env);

    // The admin panel has its own hostname and sign-in (Cloudflare Access).
    if (env.ADMIN_HOSTNAME && new URL(request.url).hostname === env.ADMIN_HOSTNAME) {
      try {
        return await adminRequest(request, env);
      } catch (error) {
        console.error('Admin request failed:', error);

        return json({ ok: false, error: 'The request failed. Refresh status before retrying.' }, 500);
      }
    }

    if (!authorized(request, env)) {
      return new Response(env.RUN_TOKEN ? 'Unauthorized' : 'Control endpoints are disabled', { status: 401 });
    }

    try {
      return await control(request, env);
    } catch (error) {
      console.error('Control request failed:', error);

      return json({ ok: false, error: 'Request failed; check status before retrying' }, 500);
    }
  },
});
