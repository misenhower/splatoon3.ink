// splatoon3.ink updater Worker: runs the shared app/ updaters and social posters on a schedule.
// See workers/updater/README.md.

import { LANES, Scheduler } from './Scheduler.mjs';
import { RegionAuth } from './RegionAuth.mjs';
import { REGIONS, setupRuntime } from './runtime.mjs';

export { Scheduler, RegionAuth };

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
        mode: url.searchParams.get('mode') ?? (lane === 'slow' ? 'all' : 'default'),
        social: url.searchParams.get('social') !== 'false',
      });

      return json(result, result.ok ? 202 : result.busy || result.paused ? 409 : 400);
    }

    case 'POST /schedule':
    case 'POST /pause':
    case 'POST /resume': {
      let lanes = lanesFrom(url);

      if (!lanes) {
        return json({ ok: false, error: `lane must be all or one of ${LANE_NAMES.join(', ')}` }, 400);
      }

      let results = await Promise.all(lanes.map(lane => {
        let stub = scheduler(env, lane);

        if (route === 'POST /schedule') {
          return stub.setAutomaticScheduling({ lane, enabled: url.searchParams.get('enabled') === 'true' });
        }

        return stub.setPaused({ lane, paused: route === 'POST /pause' });
      }));

      return json({ ok: results.every(result => result.ok), results }, results.some(result => result.busy) ? 409 : 200);
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

export default {
  // Watchdog: alarms do the work; this only re-arms anything missing. Disabled or paused
  // lanes stay that way.
  async scheduled(controller, env) {
    setupRuntime(env);
    console.info(JSON.stringify({ event: 'watchdog', cron: controller.cron, ...(await armAll(env)) }));
  },

  async fetch(request, env) {
    setupRuntime(env);

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
};
