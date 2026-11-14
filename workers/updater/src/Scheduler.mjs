import * as Sentry from '@sentry/core';
import { DurableObject } from 'cloudflare:workers';
import { captureLogs, RunLog } from './log.mjs';
import { runFastLane, runSlowLane } from './pipeline.mjs';
import { setupRuntime } from './runtime.mjs';
import { HISTORY_MS, LANE_SCHEDULES, nextSlot } from './schedule.mjs';

const MINUTE_MS = 60 * 1000;
const MAX_POSTS = 300;
const DELETE_BATCH = 128;

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

// Retries handle failures. Continuations pick up after a run that stopped at its time budget
// with work left (only the slow lane has one); they do not count as retries.
export const LANES = {
  fast: { schedule: LANE_SCHEDULES.fast, options: fastOptions, run: runFastLane, retryDelayMs: MINUTE_MS, maxRetries: 3 },
  slow: {
    schedule: LANE_SCHEDULES.slow,
    options: () => ({}),
    run: runSlowLane,
    retryDelayMs: 5 * MINUTE_MS,
    maxRetries: 2,
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
 * Owns one lane (named "fast" or "slow"): its schedule, retries, manual runs, and history.
 * Only the alarm handler runs work, so runs never overlap within a lane. The lanes are
 * separate instances and run independently of each other.
 *
 * Storage: "lane"; "state" (automatic scheduling, pause, next slot, retries, last run);
 * "pending" (one queued manual run); "run:*" and "log:*" (the last 48 hours of runs and what
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
      paused: saved.paused ?? false,
      next: saved.next ?? null,
      retryAt: saved.retryAt ?? null,
      retries: saved.retries ?? 0,
      continuing: saved.continuing ?? false,
      continuations: saved.continuations ?? 0,
      lastRun: saved.lastRun ?? null,
    };
  }

  #alarmAt(state, pending) {
    if (state.paused) return null;

    let times = [
      pending ? (pending.notBefore ?? Date.now()) : null,
      state.enabled ? (state.retryAt ?? state.next?.at ?? null) : null,
    ].filter(time => time !== null);

    return times.length ? Math.min(...times) : null;
  }

  // A follow-up manual run for one that stopped at its time budget, or null.
  #continuationOf(lane, pending, result) {
    let config = LANES[lane];
    let count = pending.continuations ?? 0;

    if (!result.ok || !result.incomplete || !config.continueDelayMs || count >= config.maxContinuations) {
      return null;
    }

    return {
      id: crypto.randomUUID(),
      ...config.options(pending),
      social: pending.social,
      status: 'queued',
      requestedAt: Date.now(),
      notBefore: Date.now() + config.continueDelayMs,
      continuationOf: pending.continuationOf ?? pending.id,
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

    return { ok: true, lane, enabled: state.enabled, paused: state.paused, alarmAt: await this.ctx.storage.getAlarm() };
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
    state.retryAt = null;
    state.retries = 0;
    state.continuing = false;
    state.continuations = 0;
    await this.ctx.storage.transaction(txn => this.#save(txn, state));

    return { ok: true, lane, enabled, next: state.next };
  }

  // Maintenance stop: no scheduled or manual runs until resumed.
  async setPaused({ lane, paused }) {
    let error = await this.#claimLane(lane);
    if (error) return { ok: false, lane, error };

    if (this.#running) return { ok: false, busy: true, error: 'Wait for the current run to finish' };

    let state = await this.#state();
    state.paused = !!paused;

    if (!state.paused && state.enabled) {
      state.next = nextSlot(LANES[lane].schedule);
      state.retryAt = null;
      state.retries = 0;
      state.continuing = false;
      state.continuations = 0;
    }

    await this.ctx.storage.transaction(txn => this.#save(txn, state));

    return { ok: true, lane, paused: state.paused };
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

    let state = await this.#state();

    if (state.paused) return { ok: false, paused: true, error: 'Scheduler is paused' };
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

    try {
      let config = LANES[lane];
      let state = await this.#state();

      if (state.paused) {
        await this.ctx.storage.deleteAlarm();

        return;
      }

      let runs = [];
      let pending = await this.ctx.storage.get('pending');
      let followUp = null;

      // A queued continuation waits for its time.
      if (pending?.notBefore > Date.now()) {
        pending = null;
      }

      if (pending) {
        let result;

        if (pending.status === 'running') {
          // The isolate stopped mid-run. Do not replay possible social posts automatically.
          result = { ok: false, error: 'Run was interrupted; check the results before retrying' };
        } else {
          await this.ctx.storage.put('pending', { ...pending, status: 'running', startedAt: Date.now() });
          result = await this.#execute(lane, { ...config.options(pending), social: pending.social }, 'manual');
        }

        runs.push({ ...pending, ...result, id: pending.id, trigger: 'manual', status: 'done' });
        followUp = this.#continuationOf(lane, pending, result);
      }

      if (state.enabled) {
        state.next ??= nextSlot(config.schedule);

        let dueAt = state.retryAt ?? state.next.at;

        if (Date.now() >= dueAt) {
          let trigger = state.continuing ? 'continuation' : state.retryAt ? 'retry' : 'scheduled';
          // A slot saved before run options existed has none; it runs with the defaults.
          let result = await this.#execute(lane, { ...config.options(state.next.options), social: true }, trigger);
          let upcoming = nextSlot(config.schedule);
          let retryAt = Date.now() + config.retryDelayMs;
          let continueAt = Date.now() + (config.continueDelayMs ?? Infinity);

          runs.push({
            ...result,
            id: crypto.randomUUID(),
            trigger,
            scheduledFor: dueAt,
            driftMs: result.startedAt - dueAt,
          });

          // Continue unfinished work, and retry failures a few times, but never past the
          // lane's next regular slot.
          if (result.ok && result.incomplete && state.continuations < (config.maxContinuations ?? 0)
            && continueAt < upcoming.at) {
            state.retryAt = continueAt;
            state.continuing = true;
            state.continuations++;
          } else if (!result.ok && state.retries < config.maxRetries && retryAt < upcoming.at) {
            state.retryAt = retryAt;
            state.retries++;
            state.continuing = false;
          } else {
            state.next = upcoming;
            state.retryAt = null;
            state.retries = 0;
            state.continuing = false;
            state.continuations = 0;
          }
        }
      }

      if (runs.length) {
        state.lastRun = { ...summarize(runs.at(-1)), postCount: runs.at(-1).posts?.length ?? 0 };
      }

      // History, state, and the next alarm are saved together, without external I/O between.
      await this.ctx.storage.transaction(async txn => {
        for (let run of runs) {
          await this.#record(txn, run);
        }

        if (pending && (await txn.get('pending'))?.id === pending.id) {
          await txn.delete('pending');

          if (followUp) {
            await txn.put('pending', followUp);
          }
        }

        await this.#save(txn, state);
      });
    } finally {
      this.#running = false;
    }
  }
}
