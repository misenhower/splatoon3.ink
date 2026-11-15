// The admin panel: a Vue app (workers/updater/admin/) served from the ADMIN_ASSETS binding, and
// its JSON API under /admin/api/. Everything here is behind Cloudflare Access.

import { Buffer } from 'node:buffer';
import {
  lastPosted, postStatus, previewStatus, setAccountEnabled, socialAccounts, socialGenerators,
} from '../../../../app/social/admin.mjs';
import { purgeDataCache, verifyPublishedData } from '../pipeline.mjs';
import { LANES } from '../Scheduler.mjs';
import { HISTORY_MS, LANE_SCHEDULES } from '../schedule.mjs';
import { REGIONS } from '../runtime.mjs';
import { verifyAccess } from './access.mjs';

const LANE_NAMES = Object.keys(LANES);
const LOG_LINES = 400;

// Status is polled every few seconds, so it only carries the newest activity. The timeline
// loads everything older by time span from /admin/api/activity.
const RECENT_RUNS = 20;
const RECENT_POSTS = 40;

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const pageHeaders = {
  ...headers,
  'Content-Security-Policy': 'default-src \'none\'; script-src \'self\'; style-src \'self\'; img-src \'self\' data:; '
    + 'font-src \'self\'; connect-src \'self\'; base-uri \'none\'; frame-ancestors \'none\'; form-action \'none\'',
  'Referrer-Policy': 'no-referrer',
};

const json = (body, status = 200) => Response.json(body, { status, headers });
const actionStatus = result => result.ok ? 200 : result.busy || result.paused ? 409 : 400;

// The archive compressor (workers/compressor/), if this environment is bound to it: the run in
// progress, recent runs and the next scheduled one. A compressor that cannot be reached is
// reported rather than failing the whole status.
async function archive(env) {
  if (!env.COMPRESSOR) return null;

  try {
    return await env.COMPRESSOR.getByName('archive').status();
  } catch (error) {
    return { error: error?.message ?? String(error), nextAt: null, current: null, runs: [] };
  }
}

async function status(env, user) {
  return {
    user,
    environment: env.ENVIRONMENT ?? null,
    siteUrl: env.SITE_URL ?? null,
    now: Date.now(),
    schedules: LANE_SCHEDULES,
    historyMs: HISTORY_MS,
    lanes: Object.fromEntries(await Promise.all(
      LANE_NAMES.map(async lane => [lane, await env.SCHEDULER.getByName(lane).status({ history: RECENT_RUNS })]),
    )),
    auth: Object.fromEntries(await Promise.all(
      REGIONS.map(async region => [region, await env.REGION_AUTH.getByName(region).status()]),
    )),
    // Recent social posts and failures, for the timeline.
    posts: await env.SCHEDULER.getByName('fast').posts({ limit: RECENT_POSTS }),
    archive: await archive(env),
  };
}

// Everything that happened in a span of time: runs, credential renewals, social posts and
// archive compressions, without log lines. `to` is exclusive.
async function activity(env, from, to) {
  let span = { from, to };
  let [runs, auth, posts, compressor] = await Promise.all([
    Promise.all(LANE_NAMES.map(async lane => [lane, await env.SCHEDULER.getByName(lane).history(span)])),
    Promise.all(REGIONS.map(async region => [region, await env.REGION_AUTH.getByName(region).events(span)])),
    env.SCHEDULER.getByName('fast').posts(span),
    archive(env),
  ]);
  // The compressor keeps a month of daily runs, so it hands them all over and they are cut here.
  let compressions = (compressor?.runs ?? []).filter(run => run.startedAt >= from && run.startedAt < to);

  return { from, to, runs: Object.fromEntries(runs), auth: Object.fromEntries(auth), posts, archive: compressions };
}

// Everything the Social page shows. The post log lives with the fast lane, which does the posting.
async function social(env) {
  let [accounts, posted, posts] = await Promise.all([
    socialAccounts(),
    lastPosted(),
    env.SCHEDULER.getByName('fast').posts(),
  ]);

  return { accounts, generators: socialGenerators(), lastPosted: posted, posts };
}

// Every published data file with its size and when it was last written. Archives are not
// published data, and there are far too many of them to list here.
async function data(env) {
  let files = [];
  let cursor;

  do {
    let page = await env.ASSETS.list({ prefix: 'data/', cursor, limit: 1000 });

    for (let object of page.objects) {
      if (!object.key.startsWith('data/archive/')) {
        files.push({ key: object.key, size: object.size, uploaded: object.uploaded.getTime() });
      }
    }

    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return {
    now: Date.now(),
    siteUrl: env.SITE_URL ?? null,
    purgeConfigured: !!(env.CLOUDFLARE_CACHE_PURGE_ZONE_ID && env.CLOUDFLARE_CACHE_PURGE_API_TOKEN),
    files,
  };
}

// Both report failure in the answer rather than as an HTTP error: a failed check is a result.
async function dataAction(pathname) {
  try {
    if (pathname === '/admin/api/data/purge') {
      return json({ ok: true, purged: await purgeDataCache() });
    }

    await verifyPublishedData();

    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: error?.message ?? String(error) });
  }
}

async function socialAction(pathname, body, env) {
  switch (pathname) {
    case '/admin/api/social/account': {
      if (typeof body.key !== 'string' || typeof body.enabled !== 'boolean') {
        return json({ ok: false, error: 'An account key and enabled (a boolean) are required.' }, 400);
      }

      return json({ ok: true, accounts: await setAccountEnabled(body.key, body.enabled) });
    }

    case '/admin/api/social/preview': {
      let preview = await previewStatus(String(body.generator), body.locale ?? 'en-US');

      return json({
        ok: true,
        text: preview.text,
        contentWrapper: preview.contentWrapper,
        media: preview.media.map(media => ({
          altText: media.altText,
          url: `data:${media.type};base64,${Buffer.from(media.file).toString('base64')}`,
        })),
      });
    }

    case '/admin/api/social/post': {
      if (!Array.isArray(body.clients) || !body.clients.every(key => typeof key === 'string')) {
        return json({ ok: false, error: 'Choose at least one account.' }, 400);
      }

      let events = await postStatus(String(body.generator), body.clients);

      await env.SCHEDULER.getByName('fast').addPosts({ posts: events });

      return json({ ok: events.every(event => event.type === 'posted'), events });
    }
  }

  return json({ ok: false, error: 'Not found.' }, 404);
}

// Recent log lines from both lanes and credential renewals, newest first. Each line names what
// printed it (a run, or a region's renewal), so the panel can open it.
async function log(env) {
  let lanes = await Promise.all(LANE_NAMES.map(async lane =>
    (await env.SCHEDULER.getByName(lane).logLines({ limit: LOG_LINES })).map(line => ({ ...line, source: lane }))));
  let auth = await Promise.all(REGIONS.map(async region =>
    (await env.REGION_AUTH.getByName(region).recentLogs()).flatMap(event => {
      let lines = event.logs?.lines ?? [];

      // A renewal that printed nothing still gets a line saying it happened.
      if (!lines.length) {
        lines = [{ at: event.finishedAt, level: event.ok ? 'info' : 'error', text: event.ok ? 'Credentials renewed' : 'Renewal failed' }];
      }

      return lines.map(line => ({ ...line, text: `${region}: ${line.text}`, source: 'auth', region, eventAt: event.at }));
    })));

  return [...lanes.flat(), ...auth.flat()].sort((a, b) => b.at - a.at).slice(0, LOG_LINES);
}

async function action(pathname, body, env) {
  if (pathname.startsWith('/admin/api/data/')) {
    return dataAction(pathname);
  }

  if (pathname.startsWith('/admin/api/social/')) {
    try {
      return await socialAction(pathname, body, env);
    } catch (error) {
      // Unknown statuses or accounts, and statuses with nothing to say, are the caller's to fix.
      return json({ ok: false, error: error?.message ?? String(error) }, 400);
    }
  }

  if (pathname === '/admin/api/archive/run') {
    if (!env.COMPRESSOR) {
      return json({ ok: false, error: 'The archive compressor is not set up for this environment.' }, 400);
    }

    if (body.dryRun !== undefined && typeof body.dryRun !== 'boolean') {
      return json({ ok: false, error: 'Dry run must be a boolean.' }, 400);
    }

    let result = await env.COMPRESSOR.getByName('archive').start({ trigger: 'manual', dryRun: body.dryRun === true });

    return json(result, result.ok ? 202 : actionStatus(result));
  }

  if (pathname === '/admin/api/archive/scheduling') {
    if (!env.COMPRESSOR) {
      return json({ ok: false, error: 'The archive compressor is not set up for this environment.' }, 400);
    }

    if (typeof body.enabled !== 'boolean') {
      return json({ ok: false, error: 'Enabled must be a boolean.' }, 400);
    }

    return json(await env.COMPRESSOR.getByName('archive').setScheduling({ enabled: body.enabled }));
  }

  // One switch for every region's scheduled renewals.
  if (pathname === '/admin/api/auth/scheduling') {
    if (typeof body.enabled !== 'boolean') {
      return json({ ok: false, error: 'Enabled must be a boolean.' }, 400);
    }

    let results = await Promise.all(REGIONS.map(region =>
      env.REGION_AUTH.getByName(region).setScheduling({ region, enabled: body.enabled })));

    return json({ ok: results.every(result => result.ok), results });
  }

  if (pathname === '/admin/api/auth/refresh') {
    if (!REGIONS.includes(body.region)) {
      return json({ ok: false, error: `Region must be one of ${REGIONS.join(', ')}.` }, 400);
    }

    let stub = env.REGION_AUTH.getByName(body.region);
    let failure = null;

    try {
      await stub.refresh({ region: body.region, trigger: 'manual' });
    } catch (error) {
      failure = error?.message ?? String(error);
    }

    // Renewal logs its failures instead of throwing; the latest event says how it went.
    let current = await stub.status();
    let latest = current.events[0];

    return latest?.ok && !failure
      ? json({ ok: true, ...current })
      : json({ ok: false, error: failure ?? latest?.errors[0] ?? 'Renewal failed.', ...current }, 502);
  }

  if (!LANE_NAMES.includes(body.lane)) {
    return json({ ok: false, error: `Lane must be one of ${LANE_NAMES.join(', ')}.` }, 400);
  }

  let lane = body.lane;
  let stub = env.SCHEDULER.getByName(lane);

  switch (pathname) {
    case '/admin/api/run': {
      // Posting to social networks is never the default from the panel.
      let result = await stub.startManual({ lane, translations: body.translations, social: body.social === true });

      return json(result, result.ok ? 202 : actionStatus(result));
    }

    case '/admin/api/scheduling': {
      if (typeof body.enabled !== 'boolean') {
        return json({ ok: false, error: 'Enabled must be a boolean.' }, 400);
      }

      let result = await stub.setAutomaticScheduling({ lane, enabled: body.enabled });

      return json(result, actionStatus(result));
    }

    case '/admin/api/pause': {
      if (typeof body.paused !== 'boolean') {
        return json({ ok: false, error: 'Paused must be a boolean.' }, 400);
      }

      let result = await stub.setPaused({ lane, paused: body.paused });

      return json(result, actionStatus(result));
    }
  }

  return json({ ok: false, error: 'Not found.' }, 404);
}

const ACTIONS = [
  '/admin/api/run', '/admin/api/scheduling', '/admin/api/pause',
  '/admin/api/auth/refresh', '/admin/api/auth/scheduling', '/admin/api/archive/run', '/admin/api/archive/scheduling',
  '/admin/api/social/account', '/admin/api/social/preview', '/admin/api/social/post',
  '/admin/api/data/purge', '/admin/api/data/verify',
];

/**
 * @param {Request} request A request to the admin hostname
 * @param {object} env Worker environment
 * @returns {Promise<Response>} The app, an API answer, or a refusal
 */
export async function adminRequest(request, env) {
  let url = new URL(request.url);
  let api = url.pathname.startsWith('/admin/api/');
  let user = await verifyAccess(request, env);

  if (!user) {
    return api
      ? json({ ok: false, error: 'Sign in through Cloudflare Access to continue.' }, 401)
      : new Response('Sign in through Cloudflare Access to continue.', { status: 401, headers });
  }

  if (!api) {
    if (!['GET', 'HEAD'].includes(request.method) || !env.ADMIN_ASSETS) {
      return new Response('Not found', { status: 404, headers });
    }

    let asset = await env.ADMIN_ASSETS.fetch(request);
    let response = new Response(asset.body, asset);

    for (let [name, value] of Object.entries(pageHeaders)) {
      response.headers.set(name, value);
    }

    return response;
  }

  if (request.method === 'GET' && url.pathname === '/admin/api/status') {
    return json(await status(env, user));
  }

  if (request.method === 'GET' && url.pathname === '/admin/api/data') {
    return json(await data(env));
  }

  if (request.method === 'GET' && url.pathname === '/admin/api/social') {
    return json(await social(env));
  }

  if (request.method === 'GET' && url.pathname === '/admin/api/log') {
    return json({ lines: await log(env) });
  }

  if (request.method === 'GET' && url.pathname === '/admin/api/activity') {
    let now = Date.now();
    let to = Number(url.searchParams.get('to')) || now + 60_000;
    let from = Number(url.searchParams.get('from')) || to - 6 * 60 * 60 * 1000;

    if (!(from < to)) {
      return json({ ok: false, error: 'From must be before to.' }, 400);
    }

    // Nothing older than the history is kept, so there is no point reading further back.
    let oldest = now - HISTORY_MS - 60_000;

    return json({
      now,
      historyMs: HISTORY_MS,
      ...(to > oldest ? await activity(env, Math.max(from, oldest), to) : { from, to, runs: {}, auth: {}, posts: [], archive: [] }),
    });
  }

  if (request.method === 'GET' && url.pathname === '/admin/api/run') {
    let lane = url.searchParams.get('lane');
    let at = Number(url.searchParams.get('at')) || undefined;
    let run = LANE_NAMES.includes(lane)
      ? await env.SCHEDULER.getByName(lane).run({ id: url.searchParams.get('id') ?? '', at })
      : null;

    return run ? json({ lane, run }) : json({ ok: false, error: 'Run not found.' }, 404);
  }

  if (request.method === 'GET' && url.pathname === '/admin/api/archive/run') {
    let run = env.COMPRESSOR ? await env.COMPRESSOR.getByName('archive').run(url.searchParams.get('id') ?? '') : null;

    return run ? json({ run }) : json({ ok: false, error: 'Compression not found.' }, 404);
  }

  if (request.method === 'GET' && url.pathname === '/admin/api/auth/event') {
    let region = url.searchParams.get('region');
    let event = REGIONS.includes(region)
      ? await env.REGION_AUTH.getByName(region).event({ at: Number(url.searchParams.get('at')) })
      : null;

    return event ? json({ region, event }) : json({ ok: false, error: 'Renewal not found.' }, 404);
  }

  if (request.method === 'POST' && ACTIONS.includes(url.pathname)) {
    // Access cookies authenticate the user; require a same-origin JSON request as well.
    if (request.headers.get('Origin') !== url.origin || request.headers.get('Content-Type') !== 'application/json') {
      return json({ ok: false, error: 'A same-origin JSON request is required.' }, 403);
    }

    let body;

    try {
      body = await request.json();
    } catch {
      body = null;
    }

    if (!body || typeof body !== 'object') {
      return json({ ok: false, error: 'Invalid request.' }, 400);
    }

    return action(url.pathname, body, env);
  }

  return json({ ok: false, error: 'Not found.' }, 404);
}
