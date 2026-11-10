// Turns the Worker's status document into what the panel draws: a flat list of runs, the
// upcoming slots, and the rows of the timeline. Pure functions; no Vue in here.

import { postMarks } from './social.js';

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

function normalize(lane, run) {
  // A manual run that was interrupted mid-way has no finish time.
  let startedAt = run.startedAt ?? run.requestedAt ?? null;
  let finishedAt = run.finishedAt ?? null;

  return {
    ...run,
    key: `${lane}:${run.id}`,
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
 * Every known run from both lanes, newest first, including the ones in progress.
 * @param {object|null} status The /admin/api/status document
 * @returns {object[]} Runs with their lane, key, state and duration
 */
export function collectRuns(status) {
  let runs = [];

  for (let [lane, state] of Object.entries(status?.lanes ?? {})) {
    for (let run of state.history ?? []) {
      runs.push(normalize(lane, run));
    }

    if (state.running && state.current) {
      runs.push({
        ...state.current,
        key: `${lane}:current`,
        id: 'current',
        lane,
        running: true,
        finishedAt: null,
        durationMs: Math.max(0, status.now - state.current.startedAt),
        results: [],
        failed: [],
        state: 'running',
      });
    }
  }

  return runs.sort((a, b) => b.startedAt - a.startedAt);
}

/**
 * A schedule's slots in (from, until].
 * @param {{ second: number, slots: Array<[number, string]> }} schedule
 * @param {number} from
 * @param {number} until
 * @returns {{ at: number, mode: string }[]} When each slot runs, and in which mode
 */
export function slotsBetween(schedule, from, until) {
  let slots = [];

  for (let hour = from - (from % HOUR); hour <= until; hour += HOUR) {
    for (let [minute, mode] of schedule.slots) {
      let at = hour + minute * MINUTE + schedule.second * 1000;

      if (at > from && at <= until) {
        slots.push({ at, mode });
      }
    }
  }

  return slots;
}

/**
 * What each lane is going to do between now and `until`, soonest first.
 * @param {object|null} status
 * @param {number} until
 * @returns {{ key: string, lane: string, at: number, mode: string, trigger: string }[]} The coming runs
 */
export function collectUpcoming(status, until) {
  let upcoming = [];

  for (let [lane, state] of Object.entries(status?.lanes ?? {})) {
    if (state.paused) continue;

    if (state.pending?.status === 'queued') {
      let at = Math.max(state.pending.notBefore ?? status.now, status.now);

      upcoming.push({ key: `${lane}:pending`, lane, at, mode: state.pending.mode, trigger: state.pending.continuationOf ? 'continuation' : 'manual' });
    }

    if (!state.enabled) continue;

    // A retry or continuation runs before the lane returns to its regular slots.
    if (state.retryAt) {
      upcoming.push({ key: `${lane}:retry`, lane, at: state.retryAt, mode: state.next?.mode, trigger: state.continuing ? 'continuation' : 'retry' });
    }

    let from = Math.max(status.now, state.retryAt ?? 0);

    for (let slot of slotsBetween(status.schedules[lane], from, until)) {
      // While retrying, the slot the lane is stuck on has already been attempted.
      if (state.retryAt && state.next && slot.at <= state.next.at) continue;

      upcoming.push({ key: `${lane}:slot:${slot.at}`, lane, at: slot.at, mode: slot.mode, trigger: 'scheduled' });
    }
  }

  return upcoming.sort((a, b) => a.at - b.at);
}

/**
 * Credential renewals as timeline marks: past events and each region's next alarm.
 * @param {object|null} status
 * @param {number} start
 * @param {number} end
 * @returns {object[]} Marks for the timeline's auth row
 */
export function authMarks(status, start, end) {
  let marks = [];

  for (let [region, auth] of Object.entries(status?.auth ?? {})) {
    for (let event of auth.events ?? []) {
      if (event.finishedAt < start || event.at > end) continue;

      marks.push({
        key: `auth:${region}:${event.at}`,
        at: event.at,
        end: event.finishedAt,
        state: event.ok ? 'ok' : 'failed',
        title: event.ok ? `${region}: credentials renewed` : `${region}: ${event.errors[0] ?? 'renewal failed'}`,
      });
    }

    if (auth.alarmAt && auth.alarmAt > status.now && auth.alarmAt <= end) {
      marks.push({ key: `auth:${region}:next`, at: auth.alarmAt, end: auth.alarmAt, state: 'upcoming', title: `${region}: renewal` });
    }
  }

  return marks.sort((a, b) => a.at - b.at);
}

/**
 * The rows of the timeline for a window of time.
 * @param {object} options
 * @param {object|null} options.status
 * @param {object[]} options.runs From collectRuns()
 * @param {number} options.start
 * @param {number} options.end
 * @returns {{ key: string, label: string, marks: object[] }[]} One row per lane, then auth and social posts
 */
export function timelineRows({ status, runs, start, end }) {
  let now = status?.now ?? Date.now();
  let upcoming = collectUpcoming(status, end);

  let lane = name => [
    ...runs
      .filter(run => run.lane === name && (run.finishedAt ?? now) >= start && run.startedAt <= end)
      .map(run => ({
        key: run.key,
        at: run.startedAt,
        end: run.finishedAt ?? now,
        state: run.state,
        selectable: true,
        title: `${run.trigger}, ${run.mode}`,
      })),
    ...upcoming
      .filter(slot => slot.lane === name && slot.at <= end)
      .map(slot => ({ key: slot.key, at: slot.at, end: slot.at, state: 'upcoming', title: `${slot.trigger}, ${slot.mode}` })),
  ];

  return [
    { key: 'fast', label: 'Fast lane', marks: lane('fast') },
    { key: 'slow', label: 'Slow lane', marks: lane('slow') },
    { key: 'auth', label: 'Nintendo auth', marks: authMarks(status, start, end) },
    { key: 'social', label: 'Social posts', marks: postMarks(status?.posts, start, end) },
  ];
}

/**
 * Tick positions for the timeline's axis.
 * @param {number} start
 * @param {number} end
 * @returns {number[]} Epoch milliseconds, on round clock times
 */
export function axisTicks(start, end) {
  let span = end - start;
  let step = span <= 3 * HOUR ? 30 * MINUTE : span <= 6 * HOUR ? HOUR : 2 * HOUR;
  let ticks = [];

  for (let at = Math.ceil(start / step) * step; at <= end; at += step) {
    ticks.push(at);
  }

  return ticks;
}

/**
 * The run to show when nothing is selected: the latest failure if it is recent, else the latest run.
 * @param {object[]} runs Newest first
 * @returns {string|null} A run key
 */
export function defaultSelection(runs) {
  let recent = runs.slice(0, 12);

  return (recent.find(run => run.state === 'failed') ?? runs[0])?.key ?? null;
}
