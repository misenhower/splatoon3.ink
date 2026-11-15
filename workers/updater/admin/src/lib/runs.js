// Lane runs as the panel shows them: finished runs, the one in progress, and what each lane
// will do next. Pure functions; no Vue in here.

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

/**
 * @param {object} run A run from a lane's history
 * @returns {'ok'|'failed'|'incomplete'|'running'} How the run ended, or that it has not
 */
export function runState(run) {
  if (run.running) return 'running';
  if (!run.ok) return 'failed';
  if (run.incomplete) return 'incomplete';

  return 'ok';
}

/**
 * @param {string} lane
 * @param {object} run A run from a lane's history
 * @returns {object} The run with its lane, state, times and per-updater results filled in
 */
export function normalizeRun(lane, run) {
  // A manual run that was interrupted mid-way has no finish time.
  let startedAt = run.startedAt ?? run.requestedAt ?? null;
  let finishedAt = run.finishedAt ?? null;

  return {
    ...run,
    lane,
    startedAt,
    finishedAt,
    durationMs: finishedAt === null ? null : finishedAt - startedAt,
    results: run.updaters?.results ?? run.updaters?.failed ?? [],
    failed: run.updaters?.failed ?? [],
    state: runState(run),
  };
}

/**
 * @param {string} lane
 * @param {object} state The lane's status
 * @param {number} now
 * @returns {object|null} The run in progress, shaped like normalizeRun()'s, or null
 */
export function currentRun(lane, state, now) {
  if (!state.running || !state.current) return null;

  return {
    ...state.current,
    id: 'current',
    lane,
    running: true,
    finishedAt: null,
    durationMs: Math.max(0, now - state.current.startedAt),
    results: [],
    failed: [],
    state: 'running',
  };
}

/**
 * A schedule's slots in (from, until].
 * @param {{ second: number, slots: Array<[number, object]> }} schedule
 * @param {number} from
 * @param {number} until
 * @returns {{ at: number, options: object }[]} When each slot runs, and the run's options
 */
export function slotsBetween(schedule, from, until) {
  let slots = [];

  for (let hour = from - (from % HOUR); hour <= until; hour += HOUR) {
    for (let [minute, options] of schedule.slots) {
      let at = hour + minute * MINUTE + schedule.second * 1000;

      if (at > from && at <= until) {
        slots.push({ at, options });
      }
    }
  }

  return slots;
}

/**
 * What each lane is going to do between now and `until`, soonest first.
 * @param {object|null} status
 * @param {number} until
 * @returns {{ key: string, lane: string, at: number, translations?: boolean, trigger: string }[]} The coming
 *   runs, with the fast lane's run option
 */
export function collectUpcoming(status, until) {
  let upcoming = [];

  for (let [lane, state] of Object.entries(status?.lanes ?? {})) {
    if (state.pending?.status === 'queued') {
      let at = Math.max(state.pending.notBefore ?? status.now, status.now);

      upcoming.push({ key: `${lane}:pending`, lane, at, translations: state.pending.translations, trigger: state.pending.continuationOf ? 'continuation' : 'manual' });
    }

    if (!state.enabled) continue;

    for (let slot of slotsBetween(status.schedules[lane], status.now, until)) {
      upcoming.push({ key: `${lane}:slot:${slot.at}`, lane, at: slot.at, translations: slot.options.translations, trigger: 'scheduled' });
    }
  }

  return upcoming.sort((a, b) => a.at - b.at);
}

/**
 * @param {number} span How much time the timeline shows at once, in milliseconds
 * @returns {number} The time between axis ticks
 */
export function tickStep(span) {
  return span <= 3 * HOUR ? 30 * MINUTE : span <= 6 * HOUR ? HOUR : 2 * HOUR;
}

/**
 * Tick positions for the timeline's axis.
 * @param {number} start
 * @param {number} end
 * @param {number} [step] Time between ticks; chosen from the span when left out
 * @returns {number[]} Epoch milliseconds, on round clock times
 */
export function axisTicks(start, end, step = tickStep(end - start)) {
  let ticks = [];

  for (let at = Math.ceil(start / step) * step; at <= end; at += step) {
    ticks.push(at);
  }

  return ticks;
}
