// Everything the updater did or is about to do, as one list: lane runs, credential renewals,
// social posts and archive compressions. The timeline and the activity list both draw from it, so they always show
// the same things. Pure functions; no Vue in here.

import { formatDuration, ROW_LABELS, runKind, TRIGGER_LABELS } from './format.js';
import { collectUpcoming, currentRun, HOUR, MINUTE, normalizeRun } from './runs.js';
import { groupDeliveries } from './social.js';

// How far ahead the timeline and the list look.
export const FUTURE_MS = 3 * HOUR;

// Where the timeline's marker sits across the visible width. The list is lined up with the
// time under it.
export const MARKER = 0.75;

const FUTURE_STATES = ['upcoming', 'queued'];

/**
 * @param {object} item
 * @returns {boolean} True for things that have not started yet
 */
export function isFuture(item) {
  return FUTURE_STATES.includes(item.state);
}

function runItem(lane, run) {
  let trigger = TRIGGER_LABELS[run.trigger] ?? run.trigger;

  return {
    key: `run:${lane}:${run.id}`,
    kind: 'run',
    row: lane,
    at: run.startedAt,
    end: run.finishedAt ?? null,
    state: run.state,
    title: ROW_LABELS[lane],
    summary: [trigger, runKind(run), run.running ? 'running' : formatDuration(run.durationMs)].filter(Boolean).join(' · '),
    manual: run.trigger === 'manual',
    run,
  };
}

function upcomingItem(slot) {
  let queued = slot.key.endsWith(':pending');

  return {
    key: `run:${slot.key}`,
    kind: 'run',
    row: slot.lane,
    at: slot.at,
    end: null,
    state: queued ? 'queued' : 'upcoming',
    title: ROW_LABELS[slot.lane],
    summary: [TRIGGER_LABELS[slot.trigger] ?? slot.trigger, runKind(slot)].filter(Boolean).join(' · '),
    manual: slot.trigger === 'manual',
    slot,
  };
}

function authItem(region, event) {
  return {
    key: `auth:${region}:${event.at}`,
    kind: 'auth',
    row: 'auth',
    at: event.at,
    end: event.finishedAt,
    state: event.ok ? 'ok' : 'failed',
    title: `${ROW_LABELS.auth} · ${region}`,
    summary: event.ok
      ? `${TRIGGER_LABELS[event.trigger] ?? 'Renewal'} · ${formatDuration(event.finishedAt - event.at)}`
      : event.errors?.[0] ?? 'Renewal failed',
    manual: event.trigger === 'manual',
    region,
    event,
  };
}

// A run of the archive compressor (workers/compressor/). There is one a day, so the timeline
// usually shows the next one only when it is close.
function archiveItem(run, running = false) {
  let trigger = TRIGGER_LABELS[run.trigger] ?? run.trigger;
  let summary;

  if (running) {
    summary = `${trigger} · running`;
  } else if (run.ok) {
    summary = `${trigger} · ${formatDuration(run.finishedAt - run.startedAt)}`;
  } else {
    summary = run.error ?? 'Failed';
  }

  return {
    key: `archive:${run.id}`,
    kind: 'archive',
    row: 'archive',
    at: run.startedAt,
    end: run.finishedAt ?? null,
    state: running ? 'running' : run.ok ? 'ok' : 'failed',
    title: run.dryRun ? `${ROW_LABELS.archive} · dry run` : ROW_LABELS.archive,
    summary,
    manual: run.trigger === 'manual',
    archive: run,
  };
}

function postItem(group) {
  let failed = group.deliveries.filter(delivery => !delivery.ok);
  let accounts = group.deliveries.filter(delivery => delivery.client);
  let summary;

  if (!accounts.length) {
    summary = 'Could not be generated';
  } else if (!failed.length) {
    summary = accounts.length === 1 ? `To ${accounts[0].client.name}` : `To ${accounts.length} accounts`;
  } else if (failed.length === group.deliveries.length) {
    summary = accounts.length === 1 ? `Failed on ${accounts[0].client.name}` : `Failed on ${accounts.length} accounts`;
  } else {
    summary = `${failed.length} of ${group.deliveries.length} failed`;
  }

  return {
    key: `post:${group.key}`,
    kind: 'post',
    row: 'social',
    at: group.at,
    end: group.at,
    state: !failed.length ? 'ok' : failed.length === group.deliveries.length ? 'failed' : 'partial',
    title: `Social · ${group.generator?.name ?? 'Unknown status'}`,
    summary: group.manual ? `${summary} · by hand` : summary,
    manual: group.manual,
    group,
  };
}

/**
 * @param {object} options
 * @param {object|null} options.status The /admin/api/status document
 * @param {{ runs: object, auth: object, posts: object, archive?: object }} options.history What
 *   has been loaded so far: runs by lane then id, renewals by region then start time, posts by
 *   id, archive compressions by id
 * @returns {object[]} Every item, newest first; things still to come are at the front
 */
export function buildActivity({ status, history }) {
  if (!status) return [];

  let now = status.now;
  let until = now + FUTURE_MS;
  let items = [];

  for (let [lane, state] of Object.entries(status.lanes ?? {})) {
    for (let run of Object.values(history.runs[lane] ?? {})) {
      items.push(runItem(lane, normalizeRun(lane, run)));
    }

    let current = currentRun(lane, state, now);

    if (current) {
      items.push(runItem(lane, current));
    }
  }

  for (let slot of collectUpcoming(status, until)) {
    items.push(upcomingItem(slot));
  }

  for (let [region, auth] of Object.entries(status.auth ?? {})) {
    for (let event of Object.values(history.auth[region] ?? {})) {
      items.push(authItem(region, event));
    }

    // Renewals are hourly, so the ones after the next follow from it.
    for (let at = auth.alarmAt; auth.hasSessionToken && at && at <= until; at += HOUR) {
      if (at <= now) continue;

      items.push({
        key: `auth:${region}:next:${at}`,
        kind: 'auth',
        row: 'auth',
        at,
        end: null,
        state: 'upcoming',
        title: `${ROW_LABELS.auth} · ${region}`,
        summary: 'Scheduled',
        manual: false,
        region,
      });
    }
  }

  for (let group of groupDeliveries(Object.values(history.posts))) {
    items.push(postItem(group));
  }

  // Only when this environment has the archive compressor.
  let archive = status.archive;

  if (archive) {
    for (let run of Object.values(history.archive ?? {})) {
      items.push(archiveItem(run));
    }

    if (archive.current && !history.archive?.[archive.current.id]) {
      items.push(archiveItem(archive.current, true));
    }

    if (archive.nextAt > now && archive.nextAt <= until) {
      items.push({
        key: `archive:next:${archive.nextAt}`,
        kind: 'archive',
        row: 'archive',
        at: archive.nextAt,
        end: null,
        state: 'upcoming',
        title: ROW_LABELS.archive,
        summary: 'Scheduled',
        manual: false,
      });
    }
  }

  return items.sort((a, b) => (isFuture(b) - isFuture(a)) || b.at - a.at || (a.key < b.key ? -1 : 1));
}

/**
 * Give marks that would cover each other on a timeline row their own level, so each one can
 * still be seen and clicked.
 * @param {{ left: number, width: number }[]} marks Positions in pixels, in any order
 * @param {{ levels?: number, gap?: number }} [options] The most levels to use, and the space
 *   to keep between marks on a level
 * @returns {{ level: number, of: number }[]} For each mark, in the order given: its level, and
 *   how many levels its group of overlapping marks uses
 */
export function stackMarks(marks, { levels = 3, gap = 2 } = {}) {
  let order = marks.map((mark, index) => index).sort((a, b) => marks[a].left - marks[b].left);
  let placed = marks.map(() => ({ level: 0, of: 1 }));
  let ends = [];
  let group = [];

  for (let index of order) {
    let mark = marks[index];

    // Nothing reaches this far: the marks before it are a finished group.
    if (ends.every(end => end + gap <= mark.left)) {
      ends = [];
      group = [];
    }

    let level = ends.findIndex(end => end + gap <= mark.left);

    if (level === -1) {
      // When every level is taken, share the one that frees up first.
      level = ends.length < levels ? ends.length : ends.indexOf(Math.min(...ends));
    }

    ends[level] = Math.max(ends[level] ?? 0, mark.left + mark.width);
    placed[index].level = level;
    group.push(index);

    for (let member of group) {
      placed[member].of = ends.length;
    }
  }

  return placed;
}

export const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'fast', label: 'Fast' },
  { key: 'slow', label: 'Slow' },
  { key: 'auth', label: 'Auth' },
  { key: 'social', label: 'Social' },
  { key: 'archive', label: 'Archive' },
];

/**
 * @param {object} item
 * @param {{ row: string, problems: boolean }} filter Which timeline row to keep ("all" for
 *   every row), and whether to keep only what went wrong
 * @returns {boolean} Whether the item passes
 */
export function matchesFilter(item, { row, problems }) {
  return (row === 'all' || item.row === row)
    && (!problems || ['failed', 'incomplete', 'partial'].includes(item.state));
}

/**
 * The item to show when nothing is selected: a recent failed run, else the latest run.
 * @param {object[]} items From buildActivity()
 * @returns {string|null} An item key
 */
export function defaultSelection(items) {
  let runs = items.filter(item => item.kind === 'run' && !isFuture(item));
  let recent = runs.slice(0, 12);

  return (recent.find(item => item.state === 'failed') ?? runs[0])?.key ?? null;
}

/**
 * What a selected item turned into once its key is gone: an upcoming run that started, a
 * queued run that is now running, a run in progress that finished.
 * @param {object} previous The item that was selected
 * @param {object[]} items The current items
 * @returns {string|null} The key to select instead, or null if nothing took its place
 */
export function followSelection(previous, items) {
  if (!isFuture(previous) && previous.state !== 'running') return null;

  let candidates = items.filter(item =>
    item.row === previous.row && item.region === previous.region && !isFuture(item)
    && Math.abs(item.at - previous.at) < 2 * MINUTE);

  candidates.sort((a, b) => Math.abs(a.at - previous.at) - Math.abs(b.at - previous.at));

  return candidates[0]?.key ?? null;
}

/**
 * Lay the list out: things to come, a "now" line, then what happened, newest first. Each row
 * gets a position, and a time that never increases down the list.
 * @param {object[]} items From buildActivity(), filtered or not
 * @param {number} now
 * @param {{ row: number, now: number }} heights Row heights in pixels
 * @returns {{ rows: object[], height: number }} Rows with `top`, `height` and `time`
 */
export function layoutList(items, now, heights) {
  let rows = [];
  let top = 0;
  let add = row => {
    rows.push({ ...row, top });
    top += row.height;
  };

  for (let item of items.filter(isFuture)) {
    add({ key: item.key, item, time: Math.max(item.at, now), height: heights.row });
  }

  add({ key: 'now', now: true, time: now, height: heights.now });

  for (let item of items.filter(item => !isFuture(item))) {
    add({ key: item.key, item, time: Math.min(item.at, now), height: heights.row });
  }

  return { rows, height: top };
}

/**
 * Where a moment sits in the list: at a row's top edge when it is the row's time, and in
 * proportion between two rows otherwise.
 * @param {object[]} rows From layoutList()
 * @param {number} time
 * @returns {number} Pixels from the top of the first row
 */
export function offsetAt(rows, time) {
  if (!rows.length || time >= rows[0].time) return 0;

  let last = rows.at(-1);

  if (time <= last.time) return last.top;

  // The first row at or before the time; the one above it is strictly later.
  let low = 1;
  let high = rows.length - 1;

  while (low < high) {
    let middle = (low + high) >> 1;

    if (rows[middle].time <= time) high = middle;
    else low = middle + 1;
  }

  let above = rows[low - 1];
  let below = rows[low];

  return above.top + (above.time - time) / (above.time - below.time) * (below.top - above.top);
}

/**
 * The opposite of offsetAt(): the moment at a position in the list.
 * @param {object[]} rows From layoutList()
 * @param {number} offset Pixels from the top of the first row
 * @returns {number} Epoch milliseconds
 */
export function timeAt(rows, offset) {
  if (!rows.length) return 0;
  if (offset <= 0) return rows[0].time;

  let index = rows.findLastIndex(row => row.top <= offset);
  let row = rows[index];
  let next = rows[index + 1];

  if (!next) return row.time;

  return row.time - (offset - row.top) / (next.top - row.top) * (row.time - next.time);
}
