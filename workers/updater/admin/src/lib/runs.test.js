import { describe, expect, it } from 'vitest';
import { axisTicks, collectRuns, collectUpcoming, defaultSelection, HOUR, MINUTE, slotsBetween, timelineRows } from './runs.js';
import { formatClock, formatDuration, formatRelative, formatWhen } from './format.js';

const T0 = Date.UTC(2026, 10, 9, 14, 0, 0);

const schedules = {
  fast: { second: 15, slots: [[0, 'quick'], [5, 'default'], [30, 'default']] },
  slow: { second: 45, slots: [[20, 'all']] },
};

function lane(overrides = {}) {
  return { enabled: true, paused: false, next: null, retryAt: null, pending: null, running: false, current: null, history: [], ...overrides };
}

function status(now, lanes) {
  return { now, schedules, lanes: { fast: lane(), slow: lane(), ...lanes }, auth: {} };
}

describe('collectRuns', () => {
  it('lists both lanes newest first with their state and duration', () => {
    let runs = collectRuns(status(T0 + 10 * MINUTE, {
      fast: lane({ history: [
        { id: 'b', ok: false, startedAt: T0 + 5 * MINUTE, finishedAt: T0 + 5 * MINUTE + 9000, updaters: { ok: false, failed: [{ name: 'Gear', ok: false, error: 'HTTP 503' }] } },
        { id: 'a', ok: true, startedAt: T0, finishedAt: T0 + 4000 },
      ] }),
      slow: lane({ history: [{ id: 'c', ok: true, incomplete: true, startedAt: T0 + MINUTE, finishedAt: T0 + 9 * MINUTE }] }),
    }));

    expect(runs.map(run => [run.key, run.state, run.durationMs])).toEqual([
      ['fast:b', 'failed', 9000],
      ['slow:c', 'incomplete', 8 * MINUTE],
      ['fast:a', 'ok', 4000],
    ]);
    expect(runs[0].failed).toEqual([{ name: 'Gear', ok: false, error: 'HTTP 503' }]);
  });

  it('includes the run in progress, timed against the server clock', () => {
    let [run] = collectRuns(status(T0 + 90_000, {
      slow: lane({ running: true, current: { startedAt: T0, mode: 'all', trigger: 'scheduled' } }),
    }));

    expect(run).toMatchObject({ key: 'slow:current', state: 'running', durationMs: 90_000, finishedAt: null });
  });

  it('keeps an interrupted manual run that never finished', () => {
    let [run] = collectRuns(status(T0, {
      fast: lane({ history: [{ id: 'x', ok: false, trigger: 'manual', requestedAt: T0 - 5000, startedAt: T0 - 4000, error: 'Run was interrupted' }] }),
    }));

    expect(run).toMatchObject({ state: 'failed', startedAt: T0 - 4000, durationMs: null });
  });

  it('handles a missing status', () => {
    expect(collectRuns(null)).toEqual([]);
  });
});

describe('upcoming slots', () => {
  it('finds the slots after a time, across the hour', () => {
    expect(slotsBetween(schedules.fast, T0 + 20 * MINUTE, T0 + 66 * MINUTE)).toEqual([
      { at: T0 + 30 * MINUTE + 15_000, mode: 'default' },
      { at: T0 + HOUR + 15_000, mode: 'quick' },
      { at: T0 + HOUR + 5 * MINUTE + 15_000, mode: 'default' },
    ]);
  });

  it('lists nothing for a paused lane or one with scheduling off, except a queued manual run', () => {
    let upcoming = collectUpcoming(status(T0 + MINUTE, {
      fast: lane({ paused: true }),
      slow: lane({ enabled: false, pending: { id: 'm', status: 'queued', mode: 'all' } }),
    }), T0 + HOUR);

    expect(upcoming).toEqual([{ key: 'slow:pending', lane: 'slow', at: T0 + MINUTE, mode: 'all', trigger: 'manual' }]);
  });

  it('puts a retry before the regular slots and does not repeat the slot being retried', () => {
    let slot = T0 + 5 * MINUTE + 15_000;
    let upcoming = collectUpcoming(status(slot + 20_000, {
      fast: lane({ next: { at: slot, mode: 'default' }, retryAt: slot + MINUTE }),
      slow: lane({ enabled: false }),
    }), T0 + 40 * MINUTE);

    expect(upcoming.map(item => [item.trigger, item.at])).toEqual([
      ['retry', slot + MINUTE],
      ['scheduled', T0 + 30 * MINUTE + 15_000],
    ]);
  });
});

describe('timelineRows', () => {
  it('draws runs inside the window, upcoming slots, and credential renewals', () => {
    let now = T0 + 10 * MINUTE;
    let document = {
      ...status(now, {
        fast: lane({ history: [
          { id: 'in', ok: true, trigger: 'scheduled', mode: 'default', startedAt: T0 + 5 * MINUTE, finishedAt: T0 + 5 * MINUTE + 5000 },
          { id: 'old', ok: true, trigger: 'scheduled', mode: 'quick', startedAt: T0 - 3 * HOUR, finishedAt: T0 - 3 * HOUR + 5000 },
        ] }),
        slow: lane({ enabled: false }),
      }),
      auth: { US: { alarmAt: T0 + 35 * MINUTE, events: [{ at: T0 - 25 * MINUTE, finishedAt: T0 - 25 * MINUTE + 2000, ok: false, errors: ['HTTP 502'] }] } },
    };

    let rows = timelineRows({ status: document, runs: collectRuns(document), start: T0 - HOUR, end: T0 + HOUR });

    expect(rows.map(row => row.key)).toEqual(['fast', 'slow', 'auth', 'social']);
    expect(rows[0].marks.map(mark => [mark.key, mark.state])).toEqual([
      ['fast:in', 'ok'],
      [`fast:slot:${T0 + 30 * MINUTE + 15_000}`, 'upcoming'],
    ]);
    expect(rows[0].marks[0].selectable).toBe(true);
    expect(rows[1].marks).toEqual([]);
    expect(rows[2].marks.map(mark => [mark.state, mark.title])).toEqual([
      ['failed', 'US: HTTP 502'],
      ['upcoming', 'US: renewal'],
    ]);
  });
});

describe('axisTicks', () => {
  it('uses round clock times and fewer ticks for longer windows', () => {
    expect(axisTicks(T0 - 10 * MINUTE, T0 + 70 * MINUTE)).toEqual([T0, T0 + 30 * MINUTE, T0 + HOUR]);
    expect(axisTicks(T0, T0 + 12 * HOUR)).toHaveLength(7);
  });
});

describe('defaultSelection', () => {
  it('prefers a recent failure over the latest run', () => {
    expect(defaultSelection([{ key: 'a', state: 'ok' }, { key: 'b', state: 'failed' }])).toBe('b');
    expect(defaultSelection([{ key: 'a', state: 'ok' }])).toBe('a');
    expect(defaultSelection([])).toBeNull();
  });
});

describe('formatting', () => {
  it('formats clock times in UTC', () => {
    expect(formatClock(T0 + 65_000)).toBe('14:01:05');
    expect(formatClock(T0, { seconds: false })).toBe('14:00');
    expect(formatClock(null)).toBe('–');
  });

  it('adds the date for another day', () => {
    expect(formatWhen(T0, T0 + HOUR)).toBe('14:00:00');
    expect(formatWhen(T0 - 24 * HOUR, T0)).toBe('Nov 8 14:00:00');
  });

  it('formats durations and relative times', () => {
    expect(formatDuration(400)).toBe('0.4s');
    expect(formatDuration(9000)).toBe('9s');
    expect(formatDuration(97_000)).toBe('1m 37s');
    expect(formatDuration(2 * HOUR + 5 * MINUTE)).toBe('2h 05m');
    expect(formatDuration(40 * 24 * HOUR + 5 * HOUR)).toBe('40d');
    expect(formatDuration(null)).toBe('–');
    expect(formatRelative(T0 + 192_000, T0)).toBe('in 3m 12s');
    expect(formatRelative(T0 - 45_000, T0)).toBe('45s ago');
    expect(formatRelative(T0 + 200, T0)).toBe('now');
  });
});
