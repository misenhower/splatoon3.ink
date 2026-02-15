import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTimeStore } from './time.mjs';

describe('useTimeStore', () => {
  let time;

  beforeEach(() => {
    setActivePinia(createPinia());
    time = useTimeStore();
  });

  describe('isCurrent', () => {
    it('returns true when endTime is in the future', () => {
      time.setNow(1000);
      expect(time.isCurrent('2099-01-01T00:00:00Z')).toBe(true);
    });

    it('returns false when endTime is in the past', () => {
      time.setNow(Date.parse('2099-01-01T00:00:00Z') + 1);
      expect(time.isCurrent('2099-01-01T00:00:00Z')).toBe(false);
    });

    it('returns false when endTime is null', () => {
      expect(time.isCurrent(null)).toBe(false);
    });
  });

  describe('isActive', () => {
    it('returns true when now is between start and end', () => {
      time.setNow(Date.parse('2024-06-15T12:00:00Z'));
      expect(time.isActive('2024-06-15T00:00:00Z', '2024-06-16T00:00:00Z')).toBe(true);
    });

    it('returns false when now is before start', () => {
      time.setNow(Date.parse('2024-06-14T00:00:00Z'));
      expect(time.isActive('2024-06-15T00:00:00Z', '2024-06-16T00:00:00Z')).toBe(false);
    });

    it('returns false when now is after end', () => {
      time.setNow(Date.parse('2024-06-17T00:00:00Z'));
      expect(time.isActive('2024-06-15T00:00:00Z', '2024-06-16T00:00:00Z')).toBe(false);
    });

    it('returns false when startTime is null', () => {
      time.setNow(1000);
      expect(time.isActive(null, '2099-01-01T00:00:00Z')).toBe(false);
    });

    it('returns false when endTime is null', () => {
      time.setNow(1000);
      expect(time.isActive('2000-01-01T00:00:00Z', null)).toBe(false);
    });
  });

  describe('isUpcoming', () => {
    it('returns true when startTime is in the future', () => {
      time.setNow(1000);
      expect(time.isUpcoming('2099-01-01T00:00:00Z')).toBe(true);
    });

    it('returns false when startTime is in the past', () => {
      time.setNow(Date.parse('2099-01-01T00:00:00Z') + 1);
      expect(time.isUpcoming('2099-01-01T00:00:00Z')).toBe(false);
    });

    it('returns false when startTime is null', () => {
      expect(time.isUpcoming(null)).toBe(false);
    });
  });

  describe('setNow', () => {
    it('sets the now value directly', () => {
      time.setNow(42000);
      expect(time.now).toBe(42000);
    });
  });

  describe('setOffset', () => {
    it('adjusts now by offset amount', () => {
      const before = time.now;
      time.setOffset(60000);
      expect(time.offset).toBe(60000);
      // now should be approximately before + 60000 (within a second tolerance)
      expect(time.now).toBeGreaterThanOrEqual(before + 59000);
    });
  });
});
