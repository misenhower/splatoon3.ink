import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTimeStore } from './time.mjs';
import { useFestivalsDataStore } from './data.mjs';
import { useUSSplatfestsStore, STATUS_ACTIVE, STATUS_UPCOMING, STATUS_PAST } from './splatfests.mjs';

function makeFestNode({ id = 'UJ-1', startTime, endTime, teams = [], results = false }) {
  return {
    __splatoon3ink_id: id,
    startTime,
    endTime,
    teams: teams.length ? teams : [
      { result: results ? {} : null },
      { result: results ? {} : null },
      { result: results ? {} : null },
    ],
  };
}

function setFestivalsData(store, nodes) {
  store.setData({
    US: { data: { festRecords: { nodes } } },
  });
}

describe('splatfests store', () => {
  let time;
  let festivalsData;
  let splatfests;

  beforeEach(() => {
    setActivePinia(createPinia());
    time = useTimeStore();
    festivalsData = useFestivalsDataStore();
  });

  describe('status detection', () => {
    it('marks festival as active when between start and end', () => {
      time.setNow(Date.parse('2024-06-15T12:00:00Z'));
      setFestivalsData(festivalsData, [
        makeFestNode({ startTime: '2024-06-15T00:00:00Z', endTime: '2024-06-16T00:00:00Z' }),
      ]);
      splatfests = useUSSplatfestsStore();
      expect(splatfests.festivals[0].status).toBe(STATUS_ACTIVE);
    });

    it('marks festival as upcoming when before start', () => {
      time.setNow(Date.parse('2024-06-14T00:00:00Z'));
      setFestivalsData(festivalsData, [
        makeFestNode({ startTime: '2024-06-15T00:00:00Z', endTime: '2024-06-16T00:00:00Z' }),
      ]);
      splatfests = useUSSplatfestsStore();
      expect(splatfests.festivals[0].status).toBe(STATUS_UPCOMING);
    });

    it('marks festival as past when after end', () => {
      time.setNow(Date.parse('2024-06-17T00:00:00Z'));
      setFestivalsData(festivalsData, [
        makeFestNode({ startTime: '2024-06-15T00:00:00Z', endTime: '2024-06-16T00:00:00Z' }),
      ]);
      splatfests = useUSSplatfestsStore();
      expect(splatfests.festivals[0].status).toBe(STATUS_PAST);
    });
  });

  describe('region parsing', () => {
    it('parses U as NA', () => {
      time.setNow(0);
      setFestivalsData(festivalsData, [
        makeFestNode({ id: 'U-1', startTime: '2020-01-01T00:00:00Z', endTime: '2020-01-02T00:00:00Z' }),
      ]);
      splatfests = useUSSplatfestsStore();
      expect(splatfests.festivals[0].regions).toEqual(['NA']);
    });

    it('parses multi-region UJEA correctly', () => {
      time.setNow(0);
      setFestivalsData(festivalsData, [
        makeFestNode({ id: 'UJEA-1', startTime: '2020-01-01T00:00:00Z', endTime: '2020-01-02T00:00:00Z' }),
      ]);
      splatfests = useUSSplatfestsStore();
      expect(splatfests.festivals[0].regions).toEqual(['NA', 'JP', 'EU', 'AP']);
    });

    it('parses J as JP', () => {
      time.setNow(0);
      setFestivalsData(festivalsData, [
        makeFestNode({ id: 'J-1', startTime: '2020-01-01T00:00:00Z', endTime: '2020-01-02T00:00:00Z' }),
      ]);
      splatfests = useUSSplatfestsStore();
      expect(splatfests.festivals[0].regions).toEqual(['JP']);
    });

    it('parses E as EU', () => {
      time.setNow(0);
      setFestivalsData(festivalsData, [
        makeFestNode({ id: 'E-1', startTime: '2020-01-01T00:00:00Z', endTime: '2020-01-02T00:00:00Z' }),
      ]);
      splatfests = useUSSplatfestsStore();
      expect(splatfests.festivals[0].regions).toEqual(['EU']);
    });

    it('parses A as AP', () => {
      time.setNow(0);
      setFestivalsData(festivalsData, [
        makeFestNode({ id: 'A-1', startTime: '2020-01-01T00:00:00Z', endTime: '2020-01-02T00:00:00Z' }),
      ]);
      splatfests = useUSSplatfestsStore();
      expect(splatfests.festivals[0].regions).toEqual(['AP']);
    });
  });

  describe('recentFestival', () => {
    it('returns past fest within 3 days', () => {
      const endTime = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
      const startTime = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      time.setNow(Date.now());
      setFestivalsData(festivalsData, [
        makeFestNode({ startTime, endTime }),
      ]);
      splatfests = useUSSplatfestsStore();
      expect(splatfests.recentFestival).not.toBeNull();
    });

    it('returns null for fest ended more than 3 days ago', () => {
      const endTime = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
      const startTime = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      time.setNow(Date.now());
      setFestivalsData(festivalsData, [
        makeFestNode({ startTime, endTime }),
      ]);
      splatfests = useUSSplatfestsStore();
      expect(splatfests.recentFestival).toBeUndefined();
    });
  });

  describe('activeFestival / upcomingFestival', () => {
    it('returns correct fest based on time', () => {
      time.setNow(Date.parse('2024-06-15T12:00:00Z'));
      setFestivalsData(festivalsData, [
        makeFestNode({ id: 'UJ-1', startTime: '2024-06-15T00:00:00Z', endTime: '2024-06-16T00:00:00Z' }),
        makeFestNode({ id: 'UJ-2', startTime: '2024-07-15T00:00:00Z', endTime: '2024-07-16T00:00:00Z' }),
      ]);
      splatfests = useUSSplatfestsStore();
      expect(splatfests.activeFestival).toBeDefined();
      expect(splatfests.activeFestival.__splatoon3ink_id).toBe('UJ-1');
      expect(splatfests.upcomingFestival).toBeDefined();
      expect(splatfests.upcomingFestival.__splatoon3ink_id).toBe('UJ-2');
    });
  });
});
