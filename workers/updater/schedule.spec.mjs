import { describe, expect, it } from 'vitest';
import { LANE_SCHEDULES, nextSlot } from './src/schedule.mjs';
import { nextRefreshAt } from './src/RegionAuth.mjs';

const at = time => Date.parse(`2026-11-08T${time}Z`);

describe('lane schedules', () => {
  it('runs quick updates through the first minutes of the hour, then default updates', () => {
    expect(nextSlot(LANE_SCHEDULES.fast, at('11:59:59'))).toEqual({ at: at('12:00:15'), mode: 'quick' });
    expect(nextSlot(LANE_SCHEDULES.fast, at('12:00:15'))).toEqual({ at: at('12:01:15'), mode: 'quick' });
    expect(nextSlot(LANE_SCHEDULES.fast, at('12:04:30'))).toEqual({ at: at('12:05:15'), mode: 'default' });
    expect(nextSlot(LANE_SCHEDULES.fast, at('12:20:15'))).toEqual({ at: at('12:30:15'), mode: 'default' });
    expect(nextSlot(LANE_SCHEDULES.fast, at('12:45:15'))).toEqual({ at: at('13:00:15'), mode: 'quick' });
  });

  it('runs the slow lane hourly', () => {
    expect(nextSlot(LANE_SCHEDULES.slow, at('12:00:00'))).toEqual({ at: at('12:20:45'), mode: 'all' });
    expect(nextSlot(LANE_SCHEDULES.slow, at('12:20:45'))).toEqual({ at: at('13:20:45'), mode: 'all' });
  });

  it('refreshes each region\'s credentials at a different minute after :35', () => {
    expect(nextRefreshAt('US', at('12:00:00'))).toBe(at('12:35:00'));
    expect(nextRefreshAt('AP', at('12:00:00'))).toBe(at('12:38:00'));
    expect(nextRefreshAt('US', at('12:35:00'))).toBe(at('13:35:00'));
  });
});
