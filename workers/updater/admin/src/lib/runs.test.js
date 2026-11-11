import { describe, expect, it } from 'vitest';
import { axisTicks, collectUpcoming, currentRun, HOUR, MINUTE, normalizeRun, slotsBetween } from './runs.js';
import { formatClock, formatDuration, formatRelative, formatWhen, runKind } from './format.js';

const T0 = Date.UTC(2026, 10, 9, 14, 0, 0);

const schedules = {
  fast: { second: 15, slots: [[0, { translations: false }], [5, { translations: true }], [30, { translations: true }]] },
  slow: { second: 45, slots: [[20, {}]] },
};

function lane(overrides = {}) {
  return { enabled: true, paused: false, next: null, retryAt: null, pending: null, running: false, current: null, history: [], ...overrides };
}

function status(now, lanes) {
  return { now, schedules, lanes: { fast: lane(), slow: lane(), ...lanes }, auth: {} };
}

describe('runs', () => {
  it('fills in state, duration and failures', () => {
    let failed = normalizeRun('fast', {
      id: 'b', ok: false, startedAt: T0, finishedAt: T0 + 9000,
      updaters: { ok: false, failed: [{ name: 'Gear', ok: false, error: 'HTTP 503' }] },
    });

    expect(failed).toMatchObject({ lane: 'fast', state: 'failed', durationMs: 9000 });
    expect(failed.failed).toEqual([{ name: 'Gear', ok: false, error: 'HTTP 503' }]);
    expect(normalizeRun('slow', { id: 'c', ok: true, incomplete: true, startedAt: T0, finishedAt: T0 + MINUTE }).state).toBe('incomplete');
  });

  it('keeps an interrupted manual run that never finished', () => {
    let run = normalizeRun('fast', { id: 'x', ok: false, trigger: 'manual', requestedAt: T0 - 5000, startedAt: T0 - 4000 });

    expect(run).toMatchObject({ state: 'failed', startedAt: T0 - 4000, durationMs: null });
  });

  it('times the run in progress against the server clock', () => {
    let state = lane({ running: true, current: { startedAt: T0, social: true, trigger: 'scheduled' } });

    expect(currentRun('slow', state, T0 + 90_000)).toMatchObject({ id: 'current', state: 'running', durationMs: 90_000, finishedAt: null });
    expect(currentRun('slow', lane(), T0)).toBeNull();
  });
});

describe('run kinds', () => {
  it('names fast lane runs by their translations option', () => {
    expect(runKind({ translations: false })).toBe('quick');
    expect(runKind({ translations: true })).toBe('full');
    expect(runKind({})).toBeNull();
    // Runs recorded before run options existed.
    expect(runKind({ mode: 'default' })).toBe('default');
  });
});

describe('upcoming slots', () => {
  it('finds the slots after a time, across the hour', () => {
    expect(slotsBetween(schedules.fast, T0 + 20 * MINUTE, T0 + 66 * MINUTE)).toEqual([
      { at: T0 + 30 * MINUTE + 15_000, options: { translations: true } },
      { at: T0 + HOUR + 15_000, options: { translations: false } },
      { at: T0 + HOUR + 5 * MINUTE + 15_000, options: { translations: true } },
    ]);
  });

  it('lists nothing for a paused lane or one with scheduling off, except a queued manual run', () => {
    let upcoming = collectUpcoming(status(T0 + MINUTE, {
      fast: lane({ paused: true }),
      slow: lane({ enabled: false, pending: { id: 'm', status: 'queued', social: false } }),
    }), T0 + HOUR);

    expect(upcoming).toEqual([{ key: 'slow:pending', lane: 'slow', at: T0 + MINUTE, translations: undefined, trigger: 'manual' }]);
  });

  it('puts a retry before the regular slots and does not repeat the slot being retried', () => {
    let slot = T0 + 5 * MINUTE + 15_000;
    let upcoming = collectUpcoming(status(slot + 20_000, {
      fast: lane({ next: { at: slot, options: { translations: true } }, retryAt: slot + MINUTE }),
      slow: lane({ enabled: false }),
    }), T0 + 40 * MINUTE);

    expect(upcoming.map(item => [item.trigger, item.at, runKind(item)])).toEqual([
      ['retry', slot + MINUTE, 'full'],
      ['scheduled', T0 + 30 * MINUTE + 15_000, 'full'],
    ]);
  });
});

describe('axisTicks', () => {
  it('uses round clock times and fewer ticks for longer windows', () => {
    expect(axisTicks(T0 - 10 * MINUTE, T0 + 70 * MINUTE)).toEqual([T0, T0 + 30 * MINUTE, T0 + HOUR]);
    expect(axisTicks(T0, T0 + 12 * HOUR)).toHaveLength(7);
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
