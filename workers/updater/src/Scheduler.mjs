import { DurableObject } from 'cloudflare:workers';
import { modes } from '../../../app/data/index.mjs';
import { runFastLane, runSlowLane } from './pipeline.mjs';
import { setupRuntime } from './runtime.mjs';
import { LANE_SCHEDULES, nextSlot } from './schedule.mjs';

const MINUTE_MS = 60 * 1000;
const MAX_HISTORY = 50;

export const LANES = {
  fast: { schedule: LANE_SCHEDULES.fast, run: runFastLane, retryDelayMs: MINUTE_MS, maxRetries: 3 },
  slow: { schedule: LANE_SCHEDULES.slow, run: runSlowLane, retryDelayMs: 5 * MINUTE_MS, maxRetries: 2 },
};

function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Owns one lane (named "fast" or "slow"): its schedule, retries, manual runs, and history.
 * Only the alarm handler runs work, so runs never overlap within a lane. The lanes are
 * separate instances and run independently of each other.
 *
 * Storage: "lane"; "state" (automatic scheduling, pause, next slot, retries, last run);
 * "pending" (one queued manual run); "run:*" (recent run history).
 */
export class Scheduler extends DurableObject {
  // True while the alarm handler is running work; RPCs that change the schedule wait for it.
  #running = false;

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
      lastRun: saved.lastRun ?? null,
    };
  }

  #alarmAt(state, pending) {
    if (state.paused) return null;
    if (pending && pending.status !== 'done') return Date.now();
    if (!state.enabled) return null;

    return state.retryAt ?? state.next?.at ?? null;
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

  async #record(storage, run) {
    let key = `run:${String(run.startedAt ?? Date.now()).padStart(15, '0')}:${run.id.slice(0, 8)}`;
    await storage.put(key, run);

    let keys = [...(await storage.list({ prefix: 'run:', reverse: true })).keys()];

    if (keys.length > MAX_HISTORY) {
      await storage.delete(keys.slice(MAX_HISTORY));
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
    }

    await this.ctx.storage.transaction(txn => this.#save(txn, state));

    return { ok: true, lane, paused: state.paused };
  }

  // Queue one manual run; the alarm executes it, so the caller does not wait.
  async startManual({ lane, mode, social = true }) {
    let error = await this.#claimLane(lane);
    if (error) return { ok: false, lane, error };

    if (!modes.includes(mode)) return { ok: false, error: `mode must be one of ${modes.join(', ')}` };

    let state = await this.#state();

    if (state.paused) return { ok: false, paused: true, error: 'Scheduler is paused' };
    if (await this.ctx.storage.get('pending')) return { ok: false, busy: true, error: 'A manual run is already queued' };

    let run = { id: crypto.randomUUID(), mode, social: !!social, status: 'queued', requestedAt: Date.now() };

    await this.ctx.storage.put('pending', run);

    if (!this.#running) {
      await this.ctx.storage.setAlarm(Date.now());
    }

    return { ok: true, lane, run };
  }

  async status() {
    let history = await this.ctx.storage.list({ prefix: 'run:', reverse: true, limit: 10 });

    return {
      lane: (await this.ctx.storage.get('lane')) ?? null,
      ...(await this.#state()),
      pending: (await this.ctx.storage.get('pending')) ?? null,
      running: this.#running,
      alarmAt: await this.ctx.storage.getAlarm(),
      history: [...history.values()],
    };
  }

  // Work

  async #execute(lane, options) {
    let startedAt = Date.now();
    let result;

    try {
      result = await LANES[lane].run(options);
    } catch (error) {
      result = { ok: false, error: describeError(error) };
    }

    result = { ...result, mode: options.mode, social: options.social, startedAt, finishedAt: Date.now() };
    console[result.ok ? 'info' : 'error'](JSON.stringify({ event: 'lane-run', lane, ...result }));

    return result;
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

      if (pending) {
        let result;

        if (pending.status === 'running') {
          // The isolate stopped mid-run. Do not replay possible social posts automatically.
          result = { ok: false, error: 'Run was interrupted; check the results before retrying' };
        } else {
          await this.ctx.storage.put('pending', { ...pending, status: 'running', startedAt: Date.now() });
          result = await this.#execute(lane, { mode: pending.mode, social: pending.social });
        }

        runs.push({ ...pending, ...result, id: pending.id, trigger: 'manual', status: 'done' });
      }

      if (state.enabled) {
        state.next ??= nextSlot(config.schedule);

        let dueAt = state.retryAt ?? state.next.at;

        if (Date.now() >= dueAt) {
          let result = await this.#execute(lane, { mode: state.next.mode, social: true });
          let upcoming = nextSlot(config.schedule);
          let retryAt = Date.now() + config.retryDelayMs;

          runs.push({
            ...result,
            id: crypto.randomUUID(),
            trigger: state.retryAt ? 'retry' : 'scheduled',
            scheduledFor: dueAt,
            driftMs: result.startedAt - dueAt,
          });

          // Retry failures a few times, but never past the lane's next regular slot.
          if (!result.ok && state.retries < config.maxRetries && retryAt < upcoming.at) {
            state.retryAt = retryAt;
            state.retries++;
          } else {
            state.next = upcoming;
            state.retryAt = null;
            state.retries = 0;
          }
        }
      }

      if (runs.length) {
        state.lastRun = runs.at(-1);
      }

      // History, state, and the next alarm are saved together, without external I/O between.
      await this.ctx.storage.transaction(async txn => {
        for (let run of runs) {
          await this.#record(txn, run);
        }

        if (pending && (await txn.get('pending'))?.id === pending.id) {
          await txn.delete('pending');
        }

        await this.#save(txn, state);
      });
    } finally {
      this.#running = false;
    }
  }
}
