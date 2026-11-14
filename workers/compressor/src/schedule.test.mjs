import { describe, expect, it } from 'vitest';
import { nextScheduledRun } from './schedule.mjs';

const next = iso => new Date(nextScheduledRun(Date.parse(iso))).toISOString();

describe('nextScheduledRun', () => {
  it('is 00:30 UTC today until then, and tomorrow from then on', () => {
    expect(next('2026-11-12T00:29:59Z')).toBe('2026-11-12T00:30:00.000Z');
    expect(next('2026-11-12T00:30:00Z')).toBe('2026-11-13T00:30:00.000Z');
    expect(next('2026-12-31T23:00:00Z')).toBe('2027-01-01T00:30:00.000Z');
  });
});
