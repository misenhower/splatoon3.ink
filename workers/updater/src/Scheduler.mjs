import * as Sentry from '@sentry/core';
import { DurableObject } from 'cloudflare:workers';
import { captureLogs, RunLog } from './log.mjs';
import { runFastLane, runSlowLane } from './pipeline.mjs';
import { RunLock } from './runLock.mjs';
import { setupRuntime } from './runtime.mjs';
import { HISTORY_MS, LANE_SCHEDULES, nextSlot } from './schedule.mjs';

const MINUTE_MS = 60 * 1000;
const MAX_POSTS = 300;
const DELETE_BATCH = 128;
// How soon a lane checks again while an earlier run still holds its lock (see runLock.mjs).
const LOCK_RETRY_MS = 15 * 1000;
const CUT_OFF = 'Cut off: Cloudflare replaced this Durable Object while the run was going, so it '
  + 'could not save its results. Its log lines are in Workers Logs. Its slot ran again.';

// Keys sort by time: "run:<start time>:<id>". A run's log lines are kept apart under "log:"
// with the same suffix, so listing runs stays cheap.
const stamp = ms => String(Math.max(0, Math.floor(ms))).padStart(15, '0');
const suffix = run => `${stamp(run.startedAt ?? run.requestedAt ?? Date.now())}:${run.id.slice(0, 8)}`;

// A run's options, from a manual request, a schedule slot, or a stored run. The fast lane has
// one: quick runs skip translations. The slow lane has none.
function fastOptions({ translations = true } = {}) {
  if (typeof translations !== 'boolean') {
    throw new TypeError('translations must be true or false');
  }

  return { translations };
}

// A failed run is not retried: the lane's next slot runs it again. A run that stopped at its
// time budget with work left (only the slow lane has one) queues a follow-up run, a
// continuation, which waits continueDelayMs.
export const LANES = {
  fast: { schedule: LANE_SCHEDULES.fast, options: fastOptions, run: runFastLane },
  slow: {
    schedule: LANE_SCHEDULES.slow,
    options: () => ({}),
    run: runSlowLane,
    continueDelayMs: MINUTE_MS,
    maxContinuations: 10,
  },
};

function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}

// A run as stored and listed: everything but its log lines and posts, which are kept apart.
function summarize(run) {
  let { logs, ...summary } = run;

  delete summary.posts;

  return { ...summary, logLines: (logs?.lines.length ?? 0) + (logs?.omitted ?? 0) };
}

/**
 * Owns one lane (named "fast" or "slow"): its schedule, manual runs, continuations, and history.
 * Only the alarm handler runs work, so runs never overlap within a lane. The lanes are
 * separate instances and run independently of each other.
 *
 * Storage: "lane"; "state" (automatic scheduling, next slot, last run);
 * "pending" (one queued manual run or continuation); "inflight" (the scheduled run going now); "run:*" and "log:*" (the last 48 hours of runs and what
 * they printed); "post:*" (the fast lane's social post log, which outlives the run history).
 */
export class Scheduler extends DurableObject {
  // True while the alarm handler is running work; RPCs that change the schedule wait for it.
  #running = false;

  // The run in progress (start time, options, trigger, and its log so far), or null.
  #current = null;

  constructor(ctx, env) {
    super(ctx, env);
    setupRuntime(env);
  }

  // Returns an error message, or null once this instance owns the lane.
  async #claimLane(lane) {
    if (!LANES[lane]) {
      return `Unknown lane: ${lane}`;
    }

    let saved = await this.ctx.storage.get('lane');

    if (saved && saved !== lane) {
      return `This scheduler owns the ${saved} lane`;
    }

    if (!saved) {
      await this.ctx.storage.put('lane', lane);
    }

    return null;
  }

  async #state() {
    let saved = (await this.ctx.storage.get('state')) ?? {};

    return {
      enabled: saved.enabled ?? this.env.AUTOMATIC_SCHEDULING_ENABLED === 'true',
      next: saved.next ?? null,
      lastRun: saved.lastRun ?? null,
    };
  }

  #alarmAt(state, pending) {
    let times = [
      pending ? (pending.notBefore ?? Date.now()) : null,
      state.enabled ? (state.next?.at ?? null) : null,
    ].filter(time => time !== null);

    return times.length ? Math.min(...times) : null;
  }

  // The queued follow-up for a run that stopped at its time budget with work left, or null.
  #continuationOf(lane, run) {
    let config = LANES[lane];
    let count = run.continuations ?? 0;

    if (!run.ok || !run.incomplete || !config.continueDelayMs || count >= config.maxContinuations) {
      return null;
    }

    return {
      id: crypto.randomUUID(),
      ...config.options(run),
      social: run.social,
      status: 'queued',
      requestedAt: Date.now(),
      notBefore: Date.now() + config.continueDelayMs,
      continuationOf: run.continuationOf ?? run.id,
      continuations: count + 1,
    };
  }

  async #save(storage, state) {
    let pending = await storage.get('pending');
    let alarmAt = this.#alarmAt(state, pending);

    await storage.put('state', state);

    if (alarmAt === null) {
      await storage.deleteAlarm();
    } else {
      await storage.setAlarm(alarmAt);
    }
  }

  // Social posts and failures, newest last. Kept apart from runs: there are few of them, and
  // they stay useful for much longer than a run's details.
  async #recordPosts(storage, posts, source) {
    if (!posts?.length) {
      return;
    }

    let entries = {};

    for (let post of posts) {
      let id = crypto.randomUUID().slice(0, 8);

      entries[`post:${stamp(post.at)}:${id}`] = { ...post, id, ...source };
    }

    await storage.put(entries);

    let keys = [...(await storage.list({ prefix: 'post:', reverse: true })).keys()];

    if (keys.length > MAX_POSTS) {
      await storage.delete(keys.slice(MAX_POSTS));
    }
  }

  async #record(storage, run) {
    let summary = { ...summarize(run), postCount: run.posts?.length ?? 0 };

    await storage.put(`run:${suffix(run)}`, summary);
    await storage.put(`log:${suffix(run)}`, { id: run.id, ...(run.logs ?? { lines: [], omitted: 0 }) });
    await this.#recordPosts(storage, run.posts, { runId: run.id });
    await this.#prune(storage);

    return summary;
  }

  async #prune(storage) {
    let cutoff = stamp(Date.now() - HISTORY_MS);

    for (let prefix of ['run:', 'log:']) {
      let keys = [...(await storage.list({ prefix, end: prefix + cutoff })).keys()];

      for (let index = 0; index < keys.length; index += DELETE_BATCH) {
        await storage.delete(keys.slice(index, index + DELETE_BATCH));
      }
    }
  }

  // RPC

  async ensureArmed({ lane }) {
    let error = await this.#claimLane(lane);
    if (error) return { ok: false, lane, error };

    if (this.#running) {
      return { lane, busy: true };
    }

    let state = await this.#state();

    if (state.enabled && !state.next) {
      state.next = nextSlot(LANES[lane].schedule);
    }

    await this.ctx.storage.transaction(txn => this.#save(txn, state));

    return { ok: true, lane, enabled: state.enabled, alarmAt: await this.ctx.storage.getAlarm() };
  }

  async setAutomaticScheduling({ lane, enabled }) {
    let error = await this.#claimLane(lane);
    if (error) return { ok: false, lane, error };

    if (typeof enabled !== 'boolean') return { ok: false, error: 'enabled must be a boolean' };
    if (this.#running) return { ok: false, busy: true, error: 'Wait for the current run to finish' };

    let state = await this.#state();

    // Missed slots are not replayed: enabling starts at the next slot.
    state.enabled = enabled;
    state.next = enabled ? nextSlot(LANES[lane].schedule) : null;
    await this.ctx.storage.transaction(txn => this.#save(txn, state));

    return { ok: true, lane, enabled, next: state.next };
  }

  // Queue one manual run; the alarm executes it, so the caller does not wait.
  async startManual({ lane, social = true, ...input }) {
    let error = await this.#claimLane(lane);
    if (error) return { ok: false, lane, error };

    let options;

    try {
      options = LANES[lane].options(input);
    } catch (error) {
      return { ok: false, error: describeError(error) };
    }

    if (await this.ctx.storage.get('pending')) return { ok: false, busy: true, error: 'A manual run is already queued' };

    let run = { id: crypto.randomUUID(), ...options, social: !!social, status: 'queued', requestedAt: Date.now() };

    await this.ctx.storage.put('pending', run);

    if (!this.#running) {
      await this.ctx.storage.setAlarm(Date.now());
    }

    return { ok: true, lane, run };
  }

  // For POST /sentry-test: an event reported the way the shared app/ code reports one.
  async sentryTest({ message }) {
    return Sentry.captureException(new Error(message));
  }

  async status({ history: limit = 10 } = {}) {
    let history = await this.ctx.storage.list({
      prefix: 'run:',
      reverse: true,
      limit: Math.min(Math.max(1, Number(limit) || 10), 100),
    });

    return {
      lane: (await this.ctx.storage.get('lane')) ?? null,
      ...(await this.#state()),
      pending: (await this.ctx.storage.get('pending')) ?? null,
      running: this.#running,
      current: this.#current && { ...this.#current, log: undefined, logLines: this.#current.log.lines.length },
      alarmAt: await this.ctx.storage.getAlarm(),
      history: [...history.values()],
    };
  }

  /**
   * The runs that started in a span of time, newest first, without their log lines.
   * @param {{ from?: number, to?: number }} [options] Epoch milliseconds; `to` is exclusive
   * @returns {Promise<object[]>} Runs
   */
  async history({ from = 0, to = Date.now() + MINUTE_MS } = {}) {
    let runs = await this.ctx.storage.list({ start: `run:${stamp(from)}`, end: `run:${stamp(to)}`, reverse: true });

    return [...runs.values()];
  }

  /**
   * One run with its log lines: a run from the history, or the one in progress ("current").
   * @param {{ id: string, at?: number }} options The run's id, and its start time if known
   *   (which finds it without reading the whole history)
   * @returns {Promise<object|null>} The run, or null if it is no longer kept
   */
  async run({ id, at }) {
    if (id === 'current') {
      return this.#current && { ...this.#current, id: 'current', log: undefined, logs: this.#current.log.toJSON() };
    }

    let find = async options => [...(await this.ctx.storage.list(options)).entries()].find(([, run]) => run.id === id);
    let found = (Number.isFinite(at) && await find({ prefix: `run:${stamp(at)}:` })) || await find({ prefix: 'run:' });

    if (!found) {
      return null;
    }

    let [key, run] = found;
    let { lines = [], omitted = 0 } = (await this.ctx.storage.get(key.replace('run:', 'log:'))) ?? {};

    return { ...run, logs: { lines, omitted } };
  }

  /**
   * The most recent log lines across runs, newest first.
   * @param {{ limit?: number }} [options]
   * @returns {Promise<{ at: number, level: string, text: string, runId: string }[]>} Log lines
   */
  async logLines({ limit = 300 } = {}) {
    let lines = (this.#current?.log.lines ?? []).map(line => ({ ...line, runId: 'current' })).reverse();
    let end;

    // Read a few runs at a time, newest first, until there are enough lines.
    while (lines.length < limit) {
      let page = await this.ctx.storage.list({ prefix: 'log:', reverse: true, limit: 25, ...(end && { end }) });

      for (let log of page.values()) {
        lines.push(...log.lines.map(line => ({ ...line, runId: log.id })).reverse());
      }

      if (page.size < 25) {
        break;
      }

      end = [...page.keys()].at(-1);
    }

    return lines.slice(0, limit);
  }

  /**
   * The social post log, newest first.
   * @param {{ limit?: number, from?: number, to?: number }} [options] `to` is exclusive
   * @returns {Promise<object[]>} Posts and failures (see StatusGeneratorManager.events)
   */
  async posts({ limit = MAX_POSTS, from = 0, to } = {}) {
    let posts = await this.ctx.storage.list({
      start: `post:${stamp(from)}`,
      end: to === undefined ? 'post:~' : `post:${stamp(to)}`,
      reverse: true,
      limit: Math.min(Math.max(1, Number(limit) || MAX_POSTS), MAX_POSTS),
    });

    return [...posts.values()];
  }

  /**
   * Add posts made outside a run (by hand, from the admin panel) to the post log.
   * @param {{ posts: object[] }} options
   */
  async addPosts({ posts }) {
    await this.ctx.storage.transaction(txn => this.#recordPosts(txn, posts, { manual: true }));
  }

  // Work

  // `options` are the lane's run options plus `social`; runs are recorded with them.
  async #execute(lane, options, trigger) {
    let startedAt = Date.now();
    let log = new RunLog;
    let result;

    this.#current = { startedAt, ...options, trigger, log };

    try {
      result = await captureLogs(log, () => LANES[lane].run(options));
    } catch (error) {
      // Failures inside the updaters are reported where they happen (app/data/index.mjs); this
      // is the run itself failing, for example when no bullet token can be had.
      Sentry.captureException(error, { tags: { lane, trigger } });
      result = { ok: false, error: describeError(error) };
      log.add('error', [`Run failed: ${result.error}`]);
    } finally {
      this.#current = null;
    }

    result = { ...result, ...options, startedAt, finishedAt: Date.now() };
    console[result.ok ? 'info' : 'error'](JSON.stringify({ event: 'lane-run', lane, ...result }));

    return { ...result, logs: log.toJSON() };
  }

  async alarm() {
    let lane = await this.ctx.storage.get('lane');

    if (!lane) {
      return;
    }

    if (this.#running) {
      await this.ctx.storage.setAlarm(Date.now() + 1000);

      return;
    }

    this.#running = true;

    let lock = new RunLock(this.env.PRIVATE, lane);
    let locked = false;

    try {
      let config = LANES[lane];
      let state = await this.#state();
      let pending = await this.ctx.storage.get('pending');
      let due = state.enabled && (state.next ??= nextSlot(config.schedule)).at <= Date.now();
      let ready = !due && !!pending && !(pending.notBefore > Date.now());

      // Like the old cron, no run starts while an earlier one may still be going: one on an
      // instance that Cloudflare replaced keeps running, and keeps posting (see runLock.mjs).
      if (due || ready) {
        let holder = await lock.holder();

        if (holder) {
          console.warn(JSON.stringify({ event: 'lane-wait', lane, holder }));
          await this.ctx.storage.setAlarm(Date.now() + LOCK_RETRY_MS);

          return;
        }
      }

      let runs = [];
      // A scheduled run that never saved its results; its slot is still due and runs below.
      let cutOff = (due || ready) && await this.ctx.storage.get('inflight');

      if (cutOff) {
        runs.push({ ...cutOff, ok: false, interrupted: true, error: CUT_OFF });
      }

      // One run per alarm, so a run always has the whole alarm's time; a scheduled slot that is
      // due goes before a queued run. Whatever is left due sets the next alarm to now.
      if (due) {
        let slot = state.next;
        let id = crypto.randomUUID();
        // A slot saved before run options existed has none; it runs with the defaults.
        let options = { ...config.options(slot.options), social: true };

        await this.ctx.storage.put('inflight', { id, trigger: 'scheduled', scheduledFor: slot.at, startedAt: Date.now(), ...options });
        await lock.acquire({ id, trigger: 'scheduled', startedAt: Date.now() });
        locked = true;

        let result = await this.#execute(lane, options, 'scheduled');

        runs.push({ ...result, id, trigger: 'scheduled', scheduledFor: slot.at, driftMs: result.startedAt - slot.at });
        state.next = nextSlot(config.schedule);
        // A queued run was not started.
        pending = null;
      } else if (ready) {
        let trigger = pending.continuationOf ? 'continuation' : 'manual';
        let result;

        if (pending.status === 'running') {
          // The isolate stopped mid-run. Do not replay possible social posts automatically.
          result = { ok: false, error: 'Run was interrupted; check the results before retrying' };
        } else {
          await this.ctx.storage.put('pending', { ...pending, status: 'running', startedAt: Date.now() });
          await lock.acquire({ id: pending.id, trigger, startedAt: Date.now() });
          locked = true;
          result = await this.#execute(lane, { ...config.options(pending), social: pending.social }, trigger);
        }

        runs.push({ ...pending, ...result, id: pending.id, trigger, status: 'done' });
      } else {
        // An early alarm, or a continuation that is not due yet.
        pending = null;
      }

      let run = (due || ready) && runs.at(-1);
      let followUp = run && !run.interrupted && this.#continuationOf(lane, run);

      if (run) {
        state.lastRun = { ...summarize(run), postCount: run.posts?.length ?? 0 };
      }

      // History, state, and the next alarm are saved together, without external I/O between.
      await this.ctx.storage.transaction(async txn => {
        for (let recorded of runs) {
          await this.#record(txn, recorded);
        }

        if (due || cutOff) {
          await txn.delete('inflight');
        }

        if (pending && (await txn.get('pending'))?.id === pending.id) {
          await txn.delete('pending');
        }

        // A manual run queued meanwhile goes ahead instead; it picks up the same work.
        if (followUp && !(await txn.get('pending'))) {
          await txn.put('pending', followUp);
        }

        await this.#save(txn, state);
      });
    } finally {
      if (locked) {
        await lock.release().catch(error => console.warn('Could not release the run lock:', describeError(error)));
      }

      this.#running = false;
    }
  }
}
