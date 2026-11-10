import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env, runDurableObjectAlarm } from 'cloudflare:test';
import worker from './src/index.mjs';
import { LANES } from './src/Scheduler.mjs';
import { adminRequest } from './src/admin/routes.mjs';
import { verifyAccess } from './src/admin/access.mjs';

vi.mock('./src/admin/access.mjs', () => ({ verifyAccess: vi.fn() }));

const origin = 'https://admin.test';
const HOUR = 60 * 60 * 1000;

function adminEnv() {
  return {
    ...env,
    ADMIN_HOSTNAME: 'admin.test',
    ENVIRONMENT: 'dev',
    ADMIN_ASSETS: { fetch: async () => new Response('<!doctype html>', { headers: { 'Content-Type': 'text/html' } }) },
  };
}

function post(path, body, headers = { Origin: origin, 'Content-Type': 'application/json' }) {
  return adminRequest(new Request(origin + path, { method: 'POST', headers, body: JSON.stringify(body) }), adminEnv());
}

beforeEach(() => {
  vi.stubGlobal('fetch', async input => {
    throw new Error(`Unexpected network request in a test: ${new Request(input).url}`);
  });
  vi.spyOn(LANES.fast, 'run').mockResolvedValue({ ok: true, unmocked: true });
  vi.spyOn(LANES.slow, 'run').mockResolvedValue({ ok: true, unmocked: true });
  verifyAccess.mockReset();
  verifyAccess.mockResolvedValue({ email: 'admin@example.test' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('admin panel', () => {
  it('requires Access before serving the app, status, or actions', async () => {
    verifyAccess.mockResolvedValue(null);

    let assets = vi.fn();
    let closed = { ...adminEnv(), ADMIN_ASSETS: { fetch: assets } };

    for (let request of [
      new Request(origin + '/'),
      new Request(origin + '/admin/api/status'),
      new Request(origin + '/admin/api/run', { method: 'POST' }),
    ]) {
      expect((await adminRequest(request, closed)).status).toBe(401);
    }

    expect(assets).not.toHaveBeenCalled();
  });

  it('is only reachable on the admin hostname', async () => {
    let request = new Request('https://updater.test/admin/api/status');

    // Other hostnames get the token-protected control endpoints, never the panel.
    expect((await worker.fetch(request, { ...adminEnv(), RUN_TOKEN: 'token' })).status).toBe(401);
    expect(verifyAccess).not.toHaveBeenCalled();
  });

  it('serves the app with a strict content policy', async () => {
    let response = await adminRequest(new Request(origin + '/'), adminEnv());

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Content-Security-Policy')).toContain('script-src \'self\'');
  });

  it('reports lanes, regions, and schedules', async () => {
    let response = await adminRequest(new Request(origin + '/admin/api/status'), adminEnv());
    let status = await response.json();

    expect(status.user).toEqual({ email: 'admin@example.test' });
    expect(status.environment).toBe('dev');
    expect(Object.keys(status.lanes)).toEqual(['fast', 'slow']);
    expect(Object.keys(status.auth)).toEqual(['US', 'EU', 'JP', 'AP']);
    expect(status.schedules.fast.slots.length).toBeGreaterThan(0);
    expect(status.modes).toContain('quick');
  });

  it('keeps what a run prints and serves it per run and as a combined log', async () => {
    vi.spyOn(LANES.fast, 'run').mockImplementation(async () => {
      console.info('[Test] updating', { files: 2 });
      console.error('[Test] failed:', new Error('SplatNet returned HTTP 503'));

      return { ok: false, updaters: { ok: false, failed: [{ name: 'CoopUpdater', ok: false, error: 'HTTP 503' }] } };
    });

    let stub = env.SCHEDULER.getByName(`test-${crypto.randomUUID()}`);

    await stub.startManual({ lane: 'fast', mode: 'quick', social: false });
    await runDurableObjectAlarm(stub);
    await vi.waitFor(async () => expect((await stub.status()).history).toHaveLength(1));

    let [summary] = (await stub.status()).history;
    expect(summary).toMatchObject({ ok: false, trigger: 'manual', logLines: 2 });
    expect(summary.logs).toBeUndefined();

    let run = await stub.run({ id: summary.id });
    expect(run.logs.lines.map(line => [line.level, line.text])).toEqual([
      ['info', '[Test] updating {"files":2}'],
      ['error', '[Test] failed: SplatNet returned HTTP 503'],
    ]);

    // Knowing the start time finds the run without reading the whole history.
    expect((await stub.run({ id: summary.id, at: summary.startedAt })).logs.lines).toHaveLength(2);
    expect(await stub.run({ id: 'missing', at: summary.startedAt })).toBeNull();

    let lines = await stub.logLines();
    expect(lines.map(line => line.level)).toEqual(['error', 'info']);
    expect(lines[0].runId).toBe(summary.id);
  });

  it('serves runs by time span and forgets them after 48 hours', async () => {
    let stub = env.SCHEDULER.getByName(`test-${crypto.randomUUID()}`);
    let run = async () => {
      let latest = (await stub.history())[0]?.id;

      await stub.startManual({ lane: 'fast', mode: 'quick', social: false });
      await runDurableObjectAlarm(stub);
      await vi.waitFor(async () => expect((await stub.history())[0]?.id).not.toBe(latest));
    };

    vi.useFakeTimers({ toFake: ['Date'] });

    try {
      let start = Date.parse('2026-11-08T00:00:00Z');

      vi.setSystemTime(start);
      await run();
      vi.setSystemTime(start + 47 * HOUR);
      await run();

      // The fake clock moves a little while each run is awaited.
      let hours = async () => (await stub.history()).map(entry => Math.floor((entry.startedAt - start) / HOUR));

      expect(await hours()).toEqual([47, 0]);
      expect(await stub.history({ from: start + HOUR, to: start + 48 * HOUR })).toHaveLength(1);
      expect(await stub.history({ from: start, to: start + HOUR })).toHaveLength(1);
      expect(await stub.history({ from: start + HOUR, to: start + 2 * HOUR })).toHaveLength(0);

      // The next run after the first one turns 48 hours old drops it, and its log lines.
      vi.setSystemTime(start + 49 * HOUR);
      await run();

      expect(await hours()).toEqual([49, 47]);
      expect((await stub.logLines()).every(line => line.at >= start + 47 * HOUR)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('serves the activity of a time span', async () => {
    let now = Date.now();
    let response = await adminRequest(new Request(`${origin}/admin/api/activity?from=${now - HOUR}&to=${now + HOUR}`), adminEnv());
    let body = await response.json();

    expect(body).toMatchObject({ from: now - HOUR, to: now + HOUR, historyMs: 48 * HOUR, posts: expect.any(Array) });
    expect(Object.keys(body.runs)).toEqual(['fast', 'slow']);
    expect(Object.keys(body.auth)).toEqual(['US', 'EU', 'JP', 'AP']);

    // A span older than anything kept is answered without reading storage.
    let old = await adminRequest(new Request(`${origin}/admin/api/activity?from=${now - 80 * HOUR}&to=${now - 70 * HOUR}`), adminEnv());
    expect(await old.json()).toMatchObject({ runs: {}, posts: [] });

    expect((await adminRequest(new Request(`${origin}/admin/api/activity?from=5&to=4`), adminEnv())).status).toBe(400);
  });

  it('serves the combined log and single runs', async () => {
    let response = await adminRequest(new Request(origin + '/admin/api/log'), adminEnv());

    expect(Array.isArray((await response.json()).lines)).toBe(true);
    expect((await adminRequest(new Request(origin + '/admin/api/run?lane=fast&id=missing'), adminEnv())).status).toBe(404);
    expect((await adminRequest(new Request(origin + '/admin/api/run?lane=nope&id=x'), adminEnv())).status).toBe(404);
  });

  it('keeps a post log from runs and from posts made by hand', async () => {
    let at = Date.now();
    let post = { at, type: 'posted', generator: { key: 'schedules', name: 'Schedules' }, client: { key: 'bluesky', name: 'Bluesky' }, locale: 'en-US' };

    vi.spyOn(LANES.fast, 'run').mockResolvedValue({ ok: true, social: true, posts: [post] });

    let stub = env.SCHEDULER.getByName(`test-${crypto.randomUUID()}`);

    await stub.startManual({ lane: 'fast', mode: 'quick', social: true });
    await runDurableObjectAlarm(stub);
    await vi.waitFor(async () => expect((await stub.status()).history).toHaveLength(1));

    let [run] = (await stub.status()).history;
    expect(run).toMatchObject({ postCount: 1 });
    expect(run.posts).toBeUndefined();

    await stub.addPosts({ posts: [{ ...post, at: at + 1000, type: 'error', error: 'HTTP 502' }] });

    let posts = await stub.posts();
    expect(posts.map(entry => [entry.type, entry.runId ?? null, entry.manual ?? false])).toEqual([
      ['error', null, true],
      ['posted', run.id, false],
    ]);
  });

  it('reports accounts, statuses, delivery times and the post log', async () => {
    let response = await adminRequest(new Request(origin + '/admin/api/social'), adminEnv());
    let body = await response.json();

    expect(body.accounts.map(account => account.key)).toEqual(['twitter', 'mastodon', 'bluesky', 'threads', 'twitter.jp', 'bluesky.jp']);
    expect(body.generators[0]).toEqual({ key: 'schedules', name: 'Schedules' });
    expect(body.lastPosted).toEqual(expect.any(Object));
    expect(Array.isArray(body.posts)).toBe(true);
  });

  it('turns an account off and on, and refuses bad social requests', async () => {
    let off = await (await post('/admin/api/social/account', { key: 'threads', enabled: false })).json();
    expect(off.accounts.find(account => account.key === 'threads').enabled).toBe(false);

    let on = await (await post('/admin/api/social/account', { key: 'threads', enabled: true })).json();
    expect(on.accounts.find(account => account.key === 'threads').enabled).toBe(true);

    expect((await post('/admin/api/social/account', { key: 'image', enabled: false })).status).toBe(400);
    expect((await post('/admin/api/social/account', { key: 'threads' })).status).toBe(400);
    expect((await post('/admin/api/social/post', { generator: 'schedules' })).status).toBe(400);
    expect((await post('/admin/api/social/post', { generator: 'schedules', clients: ['nope'] })).status).toBe(400);
    expect((await post('/admin/api/social/preview', { generator: 'nope' })).status).toBe(400);
  });

  it('lists published data files without the archives, and checks the site', async () => {
    await env.ASSETS.put('data/schedules.json', '{"a":1}');
    await env.ASSETS.put('data/locale/en-US.json', '{}');
    await env.ASSETS.put('data/archive/2026/11/09/schedules.json', '{}');
    await env.ASSETS.put('splatnet/image.png', 'x');

    let body = await (await adminRequest(new Request(origin + '/admin/api/data'), adminEnv())).json();

    expect(body.files.map(file => file.key)).toEqual(['data/locale/en-US.json', 'data/schedules.json']);
    expect(body.files[1]).toMatchObject({ size: 7, uploaded: expect.any(Number) });
    expect(body.purgeConfigured).toBe(false);

    // The site check reports a mismatch as a result, not as a failed request.
    vi.stubGlobal('fetch', async () => Response.json({ a: 2 }));

    let check = await post('/admin/api/data/verify', {});
    expect(check.status).toBe(200);
    expect(await check.json()).toMatchObject({ ok: false, error: expect.stringContaining('data/schedules.json') });

    vi.stubGlobal('fetch', async input => new URL(new Request(input).url).pathname === '/data/schedules.json'
      ? Response.json({ a: 1 })
      : new Response('missing', { status: 404 }));
    await env.ASSETS.delete('data/locale/en-US.json');

    expect(await (await post('/admin/api/data/verify', {})).json()).toEqual({ ok: true });
    expect(await (await post('/admin/api/data/purge', {})).json()).toEqual({ ok: true, purged: false });
  });

  it('reports a failed credential renewal as a failure and records it', async () => {
    // Tests have no network, so the renewal fails at its first request.
    let response = await post('/admin/api/auth/refresh', { region: 'US' });
    let body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({ ok: false, error: expect.any(String), hasSessionToken: true });
    expect(body.events[0]).toMatchObject({ ok: false, trigger: 'manual' });
    expect(body.events[0].errors.length).toBeGreaterThan(0);
    expect(body.events[0].logs).toBeUndefined();

    // The renewal can be opened with what it printed, and its lines are in the combined log.
    let at = body.events[0].at;
    let detail = await (await adminRequest(new Request(`${origin}/admin/api/auth/event?region=US&at=${at}`), adminEnv())).json();
    expect(detail.event.logs.lines.some(line => line.level === 'error')).toBe(true);
    expect((await adminRequest(new Request(`${origin}/admin/api/auth/event?region=US&at=1`), adminEnv())).status).toBe(404);
    expect((await adminRequest(new Request(`${origin}/admin/api/auth/event?region=XX&at=${at}`), adminEnv())).status).toBe(404);

    let log = await (await adminRequest(new Request(origin + '/admin/api/log'), adminEnv())).json();
    let line = log.lines.find(entry => entry.source === 'auth' && entry.level === 'error');
    expect(line).toMatchObject({ region: 'US', eventAt: at, text: expect.stringMatching(/^US: /) });

    let span = await (await adminRequest(new Request(`${origin}/admin/api/activity?from=${at - 1000}&to=${at + 1000}`), adminEnv())).json();
    expect(span.auth.US.map(event => event.at)).toEqual([at]);
  });

  it('rejects cross-origin and non-JSON actions', async () => {
    let body = { lane: 'fast', mode: 'quick' };

    expect((await post('/admin/api/run', body, { Origin: 'https://other.test', 'Content-Type': 'application/json' })).status).toBe(403);
    expect((await post('/admin/api/run', body, { Origin: origin, 'Content-Type': 'text/plain' })).status).toBe(403);
  });

  it('validates actions before reaching a scheduler', async () => {
    expect((await post('/admin/api/run', { lane: 'medium', mode: 'quick' })).status).toBe(400);
    expect((await post('/admin/api/run', { lane: 'fast', mode: 'everything' })).status).toBe(400);
    expect((await post('/admin/api/scheduling', { lane: 'fast', enabled: 'yes' })).status).toBe(400);
    expect((await post('/admin/api/pause', { lane: 'fast' })).status).toBe(400);
    expect((await post('/admin/api/auth/refresh', { region: 'XX' })).status).toBe(400);
  });

  it('queues a manual run without social posts unless asked', async () => {
    let startManual = vi.fn(async options => ({ ok: true, run: { id: 'one', ...options } }));
    let fake = { ...adminEnv(), SCHEDULER: { getByName: () => ({ startManual }) } };
    let send = body => adminRequest(new Request(origin + '/admin/api/run', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }), fake);

    expect((await send({ lane: 'fast', mode: 'quick' })).status).toBe(202);
    expect(startManual).toHaveBeenLastCalledWith({ lane: 'fast', mode: 'quick', social: false });

    await send({ lane: 'fast', mode: 'default', social: true });
    expect(startManual).toHaveBeenLastCalledWith({ lane: 'fast', mode: 'default', social: true });

    startManual.mockResolvedValue({ ok: false, busy: true });
    expect((await send({ lane: 'fast', mode: 'quick' })).status).toBe(409);
  });
});
