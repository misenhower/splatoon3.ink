import { describe, it, expect } from 'vitest';
import { getDurationParts } from './time.js';

describe('getDurationParts', () => {
  it('returns all zeros for zero', () => {
    expect(getDurationParts(0)).toEqual({
      negative: '',
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it('computes 1d 1h 1m 1s for 90061', () => {
    expect(getDurationParts(90061)).toEqual({
      negative: '',
      days: 1,
      hours: 1,
      minutes: 1,
      seconds: 1,
    });
  });

  it('sets negative flag for negative values', () => {
    const result = getDurationParts(-90061);
    expect(result.negative).toBe('-');
    expect(result.days).toBe(1);
    expect(result.hours).toBe(1);
    expect(result.minutes).toBe(1);
    expect(result.seconds).toBe(1);
  });

  it('computes exactly 1 day for 86400', () => {
    expect(getDurationParts(86400)).toEqual({
      negative: '',
      days: 1,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it('computes only seconds for 59', () => {
    expect(getDurationParts(59)).toEqual({
      negative: '',
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 59,
    });
  });

  it('computes hours and minutes without days', () => {
    expect(getDurationParts(3661)).toEqual({
      negative: '',
      days: 0,
      hours: 1,
      minutes: 1,
      seconds: 1,
    });
  });
});
