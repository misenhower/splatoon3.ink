import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env, runDurableObjectAlarm, runInDurableObject, createScheduledController } from 'cloudflare:test';
import worker from './src/index.mjs';
import { LANES } from './src/Scheduler.mjs';
import { LANE_SCHEDULES, nextSlot } from './src/schedule.mjs';
import { nextRefreshAt } from './src/RegionAuth.mjs';
import { setupRuntime } from './src/runtime.mjs';
import { verifyPublishedData } from './src/pipeline.mjs';

function scheduler() {
  return env.SCHEDULER.getByName(`test-${crypto.randomUUID()}`);
}

function regionAuth() {
  return env.REGION_AUTH.getByName(`test-${crypto.randomUUID()}`);
}

// Run a scheduler's alarm and wait for its work to finish (miniflare may also fire due alarms).
async function runAlarm(stub) {
  await runDurableObjectAlarm(stub);
  await vi.waitFor(async () => {
    let status = await stub.status();
    expect(status.running || !!status.pending).toBe(false);
  });

  return stub.status();
}

function request(path, { method = 'GET', token = 'test-run-token' } = {}) {
  return worker.fetch(new Request(`https://updater.test${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }), env);
}

beforeEach(() => {
  // Nothing in these tests may reach Nintendo, nxapi, or social networks, and no lane runs the
  // real pipeline unless a test says so (miniflare fires due alarms on its own).
  vi.stubGlobal('fetch', async input => {
    throw new Error(`Unexpected network request in a test: ${new Request(input).url}`);
  });
  vi.spyOn(LANES.fast, 'run').mockResolvedValue({ ok: true, unmocked: true });
  vi.spyOn(LANES.slow, 'run').mockResolvedValue({ ok: true, unmocked: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Scheduler', () => {
  it('starts with automatic scheduling off and arms the next slot once enabled', async () => {
    let stub = scheduler();

    expect(await stub.ensureArmed({ lane: 'fast' })).toMatchObject({ enabled: false, alarmAt: null });

    let result = await stub.setAutomaticScheduling({ lane: 'fast', enabled: true });

    expect(result).toMatchObject({ ok: true, enabled: true });
    expect(result.next).toEqual(nextSlot(LANE_SCHEDULES.fast, result.next.at - 1));
    expect((await stub.status()).alarmAt).toBe(result.next.at);

    await stub.setAutomaticScheduling({ lane: 'fast', enabled: false });
    expect((await stub.status()).alarmAt).toBeNull();
  });

  it('keeps one lane per instance', async () => {
    let stub = scheduler();
    await stub.ensureArmed({ lane: 'fast' });

    expect(await stub.ensureArmed({ lane: 'slow' })).toMatchObject({ ok: false, error: 'This scheduler owns the fast lane' });
  });

  it('runs the due slot in its mode, records it, and moves to the next slot', async () => {
    let run = vi.spyOn(LANES.fast, 'run').mockResolvedValue({ ok: true, updaters: { ok: true, failed: [] } });
    let stub = scheduler();
    let { next } = await stub.setAutomaticScheduling({ lane: 'fast', enabled: true });

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(next.at + 50);

    let status = await runAlarm(stub);

    expect(run).toHaveBeenCalledExactlyOnceWith({ mode: next.mode, social: true });
    expect(status.lastRun).toMatchObject({ ok: true, trigger: 'scheduled', scheduledFor: next.at, mode: next.mode });
    expect(status.lastRun.driftMs).toBeGreaterThanOrEqual(50);
    expect(status.next).toEqual(nextSlot(LANE_SCHEDULES.fast, next.at + 50));
    expect(status.alarmAt).toBe(status.next.at);
    expect(status.history).toHaveLength(1);
  });

  it('retries a failed run after a minute, but not past the next slot', async () => {
    vi.spyOn(LANES.fast, 'run').mockResolvedValue({ ok: false, error: 'SplatNet unavailable' });
    let stub = scheduler();
    await stub.setAutomaticScheduling({ lane: 'fast', enabled: true });

    // :05:15 is followed by :10:15, leaving room for retries.
    let fiveAfter = nextSlot(LANE_SCHEDULES.fast, Date.parse('2026-11-08T12:04:30Z'));
    await runInDurableObject(stub, async (instance, ctx) => {
      await ctx.storage.put('state', { enabled: true, next: fiveAfter });
    });

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(fiveAfter.at);

    let status = await runAlarm(stub);
    expect(status).toMatchObject({ retries: 1, retryAt: fiveAfter.at + 60_000, next: fiveAfter });

    // During the quick-update minutes, the next slot comes before any retry would.
    let quick = nextSlot(LANE_SCHEDULES.fast, Date.parse('2026-11-08T12:59:00Z'));
    await runInDurableObject(stub, async (instance, ctx) => {
      await ctx.storage.put('state', { enabled: true, next: quick });
    });
    vi.setSystemTime(quick.at);

    status = await runAlarm(stub);
    expect(status).toMatchObject({ retries: 0, retryAt: null });
    expect(status.next.at).toBe(quick.at + 60_000);
  });

  it('runs a queued manual request without changing the schedule', async () => {
    let run = vi.spyOn(LANES.slow, 'run').mockResolvedValue({ ok: true });
    let stub = scheduler();

    let queued = await stub.startManual({ lane: 'slow', mode: 'all', social: false });
    expect(queued).toMatchObject({ ok: true, run: { mode: 'all', social: false, status: 'queued' } });
    expect(await stub.startManual({ lane: 'slow', mode: 'all' })).toMatchObject({ ok: false, busy: true });

    let status = await runAlarm(stub);
    expect(run).toHaveBeenCalledExactlyOnceWith({ mode: 'all', social: false });
    expect(status).toMatchObject({ pending: null, enabled: false, alarmAt: null });
    expect(status.lastRun).toMatchObject({ ok: true, trigger: 'manual', id: queued.run.id });
  });

  it('reports an interrupted manual run instead of replaying it', async () => {
    let run = vi.spyOn(LANES.fast, 'run');
    let stub = scheduler();
    await stub.ensureArmed({ lane: 'fast' });
    await runInDurableObject(stub, async (instance, ctx) => {
      await ctx.storage.put('pending', { id: crypto.randomUUID(), mode: 'quick', social: true, status: 'running' });
      await ctx.storage.setAlarm(Date.now());
    });

    await runAlarm(stub);

    expect(run).not.toHaveBeenCalled();
    expect((await stub.status()).lastRun).toMatchObject({ ok: false, error: expect.stringContaining('interrupted') });
  });

  it('rejects unknown modes and stays stopped while paused', async () => {
    let stub = scheduler();

    expect(await stub.startManual({ lane: 'fast', mode: 'everything' })).toMatchObject({ ok: false });

    await stub.setAutomaticScheduling({ lane: 'fast', enabled: true });
    await stub.setPaused({ lane: 'fast', paused: true });

    expect((await stub.status()).alarmAt).toBeNull();
    expect(await stub.ensureArmed({ lane: 'fast' })).toMatchObject({ paused: true, alarmAt: null });
    expect(await stub.startManual({ lane: 'fast', mode: 'quick' })).toMatchObject({ ok: false, paused: true });

    await stub.setPaused({ lane: 'fast', paused: false });
    expect((await stub.status()).alarmAt).not.toBeNull();
  });
});

describe('RegionAuth', () => {
  it('serves cached bullet tokens from private storage', async () => {
    await env.PRIVATE.put('cache/nso.12345678.bulletToken.json', JSON.stringify({
      expires: Date.now() + 3600_000,
      data: { bulletToken: 'cached-token' },
    }));

    expect(await regionAuth().bulletToken({ region: 'US' })).toEqual({ bulletToken: 'cached-token' });
  });

  it('arms its hourly refresh only for regions with a session token', async () => {
    let us = regionAuth();
    let eu = regionAuth();

    let armed = await us.ensureArmed({ region: 'US' });
    expect(armed).toMatchObject({ region: 'US', armed: true });
    expect(armed.alarmAt).toBe(nextRefreshAt('US', armed.alarmAt - 3600_000));

    expect(await eu.ensureArmed({ region: 'EU' })).toMatchObject({ armed: false, reason: 'no session token' });
  });
});

describe('control endpoints', () => {
  it('requires the run token', async () => {
    expect((await request('/status', { token: null })).status).toBe(401);
    expect((await request('/status', { token: 'wrong' })).status).toBe(401);
  });

  it('reports both lanes and every region', async () => {
    let response = await request('/status');
    let body = await response.json();

    expect(response.status).toBe(200);
    expect(Object.keys(body.lanes)).toEqual(['fast', 'slow']);
    expect(Object.keys(body.auth)).toEqual(['US', 'EU', 'JP', 'AP']);
  });

  it('queues manual runs and validates their parameters', async () => {
    vi.spyOn(LANES.fast, 'run').mockResolvedValue({ ok: true });

    expect((await request('/run?lane=elsewhere', { method: 'POST' })).status).toBe(400);
    expect((await request('/run?lane=fast&mode=sometimes', { method: 'POST' })).status).toBe(400);

    let response = await request('/run?lane=fast&mode=quick&social=false', { method: 'POST' });
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ ok: true, run: { mode: 'quick', social: false } });

    await runAlarm(env.SCHEDULER.getByName('fast'));
    expect(LANES.fast.run).toHaveBeenCalledExactlyOnceWith({ mode: 'quick', social: false });
  });

  it('toggles automatic scheduling for both lanes', async () => {
    let response = await request('/schedule?lane=all&enabled=true', { method: 'POST' });
    let body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.results.map(result => result.lane)).toEqual(['fast', 'slow']);

    await request('/schedule?lane=all&enabled=false', { method: 'POST' });
  });

  it('re-arms everything from the cron watchdog', async () => {
    let log = vi.spyOn(console, 'info').mockImplementation(() => {});

    await worker.scheduled(createScheduledController({ cron: '*/5 * * * *' }), env);

    let entry = JSON.parse(log.mock.calls.find(([line]) => line.includes('watchdog'))[0]);
    expect(entry.lanes.map(lane => lane.lane)).toEqual(['fast', 'slow']);
    expect(entry.auth.find(region => region.region === 'US')).toMatchObject({ armed: true });
  });
});

describe('verifyPublishedData', () => {
  beforeEach(() => setupRuntime(env));

  async function publish(key, data) {
    await env.ASSETS.put(key, JSON.stringify(data));
  }

  function serve(files) {
    vi.stubGlobal('fetch', async input => {
      let key = new URL(new Request(input).url).pathname.slice(1);

      return key in files ? Response.json(files[key]) : new Response('missing', { status: 404 });
    });
  }

  it('passes when the rendering site serves the published data', async () => {
    await publish('data/schedules.json', { a: 1 });
    await publish('data/locale/en-US.json', { b: 2 });
    serve({ 'data/schedules.json': { a: 1 }, 'data/locale/en-US.json': { b: 2 } });

    await expect(verifyPublishedData('https://site.test')).resolves.toBeUndefined();
  });

  it('fails while the site still serves older data', async () => {
    await publish('data/schedules.json', { a: 2 });
    serve({ 'data/schedules.json': { a: 1 } });

    await expect(verifyPublishedData('https://site.test')).rejects.toThrow('does not serve this Worker\'s data/schedules.json yet');
  });

  it('requires a rendering site', async () => {
    await expect(verifyPublishedData('')).rejects.toThrow('SITE_URL');
  });
});
