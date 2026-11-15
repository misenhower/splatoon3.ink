import { describe, expect, it } from 'vitest';
import {
  buildActivity, defaultSelection, followSelection, isFuture, layoutList, matchesFilter, offsetAt, stackMarks, timeAt,
} from './activity.js';
import { HOUR, MINUTE } from './runs.js';
import { groupDeliveries } from './social.js';

const T0 = Date.UTC(2026, 10, 9, 14, 0, 0);

const schedules = {
  fast: { second: 15, slots: [[0, { translations: false }], [30, { translations: true }]] },
  slow: { second: 45, slots: [[20, {}]] },
};

function lane(overrides = {}) {
  return { enabled: true, next: null, pending: null, running: false, current: null, ...overrides };
}

function status(now, overrides = {}) {
  return { now, schedules, lanes: { fast: lane(), slow: lane({ enabled: false }) }, auth: {}, ...overrides };
}

function history(overrides = {}) {
  return { runs: { fast: {}, slow: {} }, auth: {}, posts: {}, ...overrides };
}

const bluesky = { key: 'bluesky', name: 'Bluesky' };
const mastodon = { key: 'mastodon', name: 'Mastodon' };
const schedulesStatus = { key: 'schedules', name: 'Schedules' };

describe('buildActivity', () => {
  it('puts runs, renewals and posts in one list, what is coming first, then newest first', () => {
    let now = T0 + 10 * MINUTE;
    let items = buildActivity({
      status: status(now, {
        auth: { US: { hasSessionToken: true, alarmAt: T0 + 35 * MINUTE }, EU: { hasSessionToken: false, alarmAt: null } },
      }),
      history: history({
        runs: {
          fast: {
            a: { id: 'a', ok: true, trigger: 'scheduled', translations: false, startedAt: T0 + 15_000, finishedAt: T0 + 19_000 },
            b: { id: 'b', ok: false, trigger: 'manual', translations: true, startedAt: T0 + 5 * MINUTE, finishedAt: T0 + 5 * MINUTE + 2000 },
          },
          slow: {},
        },
        auth: { US: { [T0 - 25 * MINUTE]: { at: T0 - 25 * MINUTE, finishedAt: T0 - 25 * MINUTE + 2000, ok: false, trigger: 'scheduled', errors: ['HTTP 502'] } } },
        posts: {
          p1: { id: 'p1', at: T0 + 50_000, type: 'posted', generator: schedulesStatus, client: bluesky, runId: 'a' },
          p2: { id: 'p2', at: T0 + 51_000, type: 'error', generator: schedulesStatus, client: mastodon, runId: 'a', error: 'HTTP 500' },
        },
      }),
    });

    expect(items.map(item => [item.key, item.state])).toEqual([
      [`run:fast:slot:${T0 + 3 * HOUR + 15_000}`, 'upcoming'],
      [`auth:US:next:${T0 + 2 * HOUR + 35 * MINUTE}`, 'upcoming'],
      [`run:fast:slot:${T0 + 2 * HOUR + 30 * MINUTE + 15_000}`, 'upcoming'],
      [`run:fast:slot:${T0 + 2 * HOUR + 15_000}`, 'upcoming'],
      [`auth:US:next:${T0 + HOUR + 35 * MINUTE}`, 'upcoming'],
      [`run:fast:slot:${T0 + HOUR + 30 * MINUTE + 15_000}`, 'upcoming'],
      [`run:fast:slot:${T0 + HOUR + 15_000}`, 'upcoming'],
      [`auth:US:next:${T0 + 35 * MINUTE}`, 'upcoming'],
      [`run:fast:slot:${T0 + 30 * MINUTE + 15_000}`, 'upcoming'],
      ['run:fast:b', 'failed'],
      ['post:schedules:a', 'partial'],
      ['run:fast:a', 'ok'],
      [`auth:US:${T0 - 25 * MINUTE}`, 'failed'],
    ]);

    let byKey = Object.fromEntries(items.map(item => [item.key, item]));

    expect(byKey['run:fast:a']).toMatchObject({ row: 'fast', title: 'Fast lane', summary: 'Scheduled · quick · 4s', manual: false });
    expect(byKey['run:fast:b'].manual).toBe(true);
    expect(byKey['post:schedules:a']).toMatchObject({ row: 'social', title: 'Social · Schedules', summary: '1 of 2 failed', at: T0 + 51_000 });
    expect(byKey[`auth:US:${T0 - 25 * MINUTE}`]).toMatchObject({ row: 'auth', region: 'US', title: 'Nintendo auth · US', summary: 'HTTP 502' });
  });

  it('shows archive compressions, the one in progress, and the next when it is close', () => {
    let now = T0 + 10 * MINUTE;
    let done = { id: 'c1', trigger: 'scheduled', maxDays: 10, dryRun: false, startedAt: T0 - 9 * HOUR, finishedAt: T0 - 9 * HOUR + 43_000, ok: true, exitCode: 0 };
    let failed = { id: 'c2', trigger: 'manual', dryRun: true, startedAt: T0 - HOUR, finishedAt: T0 - HOUR + 5000, ok: false, exitCode: 1, error: 'Exit code 1' };
    let current = { id: 'c3', trigger: 'manual', dryRun: false, startedAt: T0 + 5 * MINUTE };
    let archive = item => [item.key, item.state, item.title, item.summary];
    let only = items => items.filter(item => item.kind === 'archive').map(archive);

    let items = buildActivity({
      status: status(now, { archive: { nextAt: T0 + 2 * HOUR, current, runs: [] } }),
      history: history({ archive: { c1: done, c2: failed } }),
    });

    expect(only(items)).toEqual([
      [`archive:next:${T0 + 2 * HOUR}`, 'upcoming', 'Archive', 'Scheduled'],
      ['archive:c3', 'running', 'Archive', 'Manual · running'],
      ['archive:c2', 'failed', 'Archive · dry run', 'Exit code 1'],
      ['archive:c1', 'ok', 'Archive', 'Scheduled · 43s'],
    ]);

    // The next run is a day away: too far for the timeline. Without the compressor, nothing.
    let later = buildActivity({ status: status(now, { archive: { nextAt: T0 + 20 * HOUR, current: null, runs: [] } }), history: history() });
    expect(only(later)).toEqual([]);
    expect(only(buildActivity({ status: status(now), history: history({ archive: { c1: done } }) }))).toEqual([]);
  });

  it('shows the run in progress and a queued manual run', () => {
    let now = T0 + 20 * MINUTE + 50_000;
    let items = buildActivity({
      status: status(now, {
        lanes: {
          fast: lane({ enabled: false, pending: { id: 'm', status: 'queued', translations: false } }),
          slow: lane({ enabled: false, running: true, current: { startedAt: T0 + 20 * MINUTE + 45_000, social: true, trigger: 'scheduled' } }),
        },
      }),
      history: history(),
    });

    expect(items.map(item => [item.key, item.state, item.summary])).toEqual([
      ['run:fast:pending', 'queued', 'Manual · quick'],
      ['run:slow:current', 'running', 'Scheduled · running'],
    ]);
  });

  it('handles a missing status', () => {
    expect(buildActivity({ status: null, history: history() })).toEqual([]);
  });
});

describe('groupDeliveries', () => {
  it('makes one entry per status per run, and groups posts made by hand by time', () => {
    let groups = groupDeliveries([
      { at: T0 + 2000, type: 'posted', generator: schedulesStatus, client: mastodon, runId: 'r1' },
      { at: T0 + 1000, type: 'posted', generator: schedulesStatus, client: bluesky, runId: 'r1' },
      { at: T0 + HOUR, type: 'posted', generator: schedulesStatus, client: bluesky, manual: true },
      { at: T0 + HOUR + 500, type: 'error', generator: schedulesStatus, client: mastodon, manual: true, error: 'Account is turned off' },
      { at: T0 + 2 * HOUR, type: 'error', generator: { key: 'gear', name: 'Gear' }, client: null, runId: 'r2', error: 'No data' },
    ]);

    expect(groups.map(group => [group.key, group.at, group.deliveries.map(delivery => delivery.ok)])).toEqual([
      ['gear:r2', T0 + 2 * HOUR, [false]],
      [`schedules:m${T0 + HOUR}`, T0 + HOUR + 500, [true, false]],
      ['schedules:r1', T0 + 2000, [true, true]],
    ]);
    expect(groups[2].deliveries.map(delivery => delivery.client.key)).toEqual(['bluesky', 'mastodon']);
  });
});

describe('filters and selection', () => {
  let items = [
    { key: 'next', kind: 'run', row: 'fast', state: 'upcoming', at: T0 + HOUR },
    { key: 'a', kind: 'run', row: 'fast', state: 'ok', at: T0 },
    { key: 'p', kind: 'post', row: 'social', state: 'partial', at: T0 - 1000 },
    { key: 'b', kind: 'run', row: 'slow', state: 'failed', at: T0 - MINUTE },
    { key: 'c', kind: 'auth', row: 'auth', state: 'ok', at: T0 - HOUR, region: 'US' },
  ];

  it('filters by timeline row and by problems', () => {
    let keys = filter => items.filter(item => matchesFilter(item, filter)).map(item => item.key);

    expect(keys({ row: 'all', problems: false })).toHaveLength(5);
    expect(keys({ row: 'fast', problems: false })).toEqual(['next', 'a']);
    expect(keys({ row: 'all', problems: true })).toEqual(['p', 'b']);
    expect(keys({ row: 'auth', problems: true })).toEqual([]);
  });

  it('selects a recent failed run by default, else the latest run', () => {
    expect(defaultSelection(items)).toBe('b');
    expect(defaultSelection(items.filter(item => item.key !== 'b'))).toBe('a');
    expect(defaultSelection([items[0]])).toBeNull();
  });

  it('follows an upcoming or running item to what it became', () => {
    let slot = { key: 'run:fast:slot:1', row: 'fast', state: 'upcoming', at: T0 + 15_000 };
    let now = [
      { key: 'run:slow:x', row: 'slow', state: 'ok', at: T0 + 15_400 },
      { key: 'run:fast:current', row: 'fast', state: 'running', at: T0 + 15_600 },
      { key: 'run:fast:old', row: 'fast', state: 'ok', at: T0 - 5 * MINUTE },
    ];

    expect(followSelection(slot, now)).toBe('run:fast:current');
    expect(followSelection({ ...now[1] }, [{ key: 'run:fast:done', row: 'fast', state: 'ok', at: T0 + 15_600 }])).toBe('run:fast:done');
    expect(followSelection(slot, [now[2]])).toBeNull();
    // Finished items never turn into something else.
    expect(followSelection({ key: 'run:fast:gone', row: 'fast', state: 'ok', at: T0 }, now)).toBeNull();
    // A region's renewal only becomes that region's renewal.
    expect(followSelection({ key: 'auth:US:next:1', row: 'auth', region: 'US', state: 'upcoming', at: T0 }, [
      { key: 'auth:EU:1', row: 'auth', region: 'EU', state: 'ok', at: T0 + 100 },
      { key: 'auth:US:2', row: 'auth', region: 'US', state: 'ok', at: T0 + 900 },
    ])).toBe('auth:US:2');
  });
});

describe('list layout', () => {
  let now = T0;
  let items = [
    { key: 'later', state: 'upcoming', at: T0 + 30 * MINUTE },
    { key: 'soon', state: 'upcoming', at: T0 + 10 * MINUTE },
    { key: 'queued', state: 'queued', at: T0 - 1000 },
    { key: 'running', state: 'running', at: T0 - 20_000 },
    { key: 'done', state: 'ok', at: T0 - 10 * MINUTE },
    { key: 'older', state: 'ok', at: T0 - 70 * MINUTE },
  ];
  let { rows, height } = layoutList(items, now, { row: 40, now: 20 });

  it('puts what is coming above a now line, with times that never increase', () => {
    expect(rows.map(row => [row.key, row.top])).toEqual([
      ['later', 0], ['soon', 40], ['queued', 80], ['now', 120], ['running', 140], ['done', 180], ['older', 220],
    ]);
    expect(height).toBe(260);
    expect(rows.every((row, index) => index === 0 || row.time <= rows[index - 1].time)).toBe(true);
    expect(isFuture(items[2])).toBe(true);
  });

  it('maps a time to a position, in proportion between rows', () => {
    expect(offsetAt(rows, T0 + HOUR)).toBe(0);
    expect(offsetAt(rows, T0 + 30 * MINUTE)).toBe(0);
    expect(offsetAt(rows, T0 + 20 * MINUTE)).toBe(20);
    expect(offsetAt(rows, T0 + 10 * MINUTE)).toBe(40);
    // The queued run sits at "now", so the now line is where the present is.
    expect(offsetAt(rows, T0)).toBe(80);
    expect(offsetAt(rows, T0 - 10 * MINUTE)).toBe(180);
    expect(offsetAt(rows, T0 - 40 * MINUTE)).toBe(200);
    expect(offsetAt(rows, T0 - 5 * HOUR)).toBe(220);
    expect(offsetAt([], T0)).toBe(0);
  });

  it('maps a position back to a time', () => {
    expect(timeAt(rows, -50)).toBe(T0 + 30 * MINUTE);
    expect(timeAt(rows, 20)).toBe(T0 + 20 * MINUTE);
    expect(timeAt(rows, 130)).toBe(T0 - 10_000);
    expect(timeAt(rows, 200)).toBe(T0 - 40 * MINUTE);
    expect(timeAt(rows, 999)).toBe(T0 - 70 * MINUTE);

    for (let time of [T0 + 25 * MINUTE, T0 + 3 * MINUTE, T0 - 5000, T0 - 33 * MINUTE]) {
      expect(timeAt(rows, offsetAt(rows, time))).toBeCloseTo(time, 3);
    }
  });
});

describe('stackMarks', () => {
  it('leaves marks that do not touch on one level', () => {
    expect(stackMarks([{ left: 0, width: 6 }, { left: 8, width: 6 }, { left: 40, width: 10 }]))
      .toEqual([{ level: 0, of: 1 }, { level: 0, of: 1 }, { level: 0, of: 1 }]);
  });

  it('gives overlapping marks their own levels, group by group', () => {
    let placed = stackMarks([
      { left: 100, width: 6 }, { left: 100, width: 6 }, { left: 103, width: 6 },
      { left: 300, width: 6 },
      { left: 10, width: 50 }, { left: 20, width: 6 }, { left: 30, width: 6 },
    ]);

    expect(placed).toEqual([
      { level: 0, of: 3 }, { level: 1, of: 3 }, { level: 2, of: 3 },
      { level: 0, of: 1 },
      // The second short mark fits after the first one, beside the long one.
      { level: 0, of: 2 }, { level: 1, of: 2 }, { level: 1, of: 2 },
    ]);
  });

  it('shares a level once they are all taken', () => {
    let placed = stackMarks([0, 1, 2, 3].map(left => ({ left, width: 6 })), { levels: 3 });

    expect(placed.map(mark => mark.level)).toEqual([0, 1, 2, 0]);
    expect(placed.every(mark => mark.of === 3)).toBe(true);
  });
});
