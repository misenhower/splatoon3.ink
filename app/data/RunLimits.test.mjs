import { afterEach, describe, expect, it, vi } from 'vitest';
import RunLimits from './RunLimits.mjs';

describe('RunLimits', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('never runs out of time without a deadline', () => {
    let limits = new RunLimits;

    expect(limits.outOfTime()).toBe(false);
    expect(limits.incomplete).toBe(false);
  });

  it('marks the run incomplete once the deadline passes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    let limits = new RunLimits({ deadline: 2000 });

    expect(limits.outOfTime()).toBe(false);
    expect(limits.incomplete).toBe(false);

    vi.setSystemTime(2000);

    expect(limits.outOfTime()).toBe(true);
    expect(limits.incomplete).toBe(true);
  });
});
