import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTimeStore } from './time.mjs';
import { useSchedulesDataStore } from './data.mjs';
import { useSalmonRunSchedulesStore } from './schedules.mjs';

function makeCoopNode({ startTime, endTime, isBigRun = false, weapons = [] }) {
  return {
    startTime,
    endTime,
    setting: { weapons, vsStages: [] },
    ...(isBigRun ? {} : {}),
  };
}

function setSchedulesData(store, { regularNodes = [], bigRunNodes = [] } = {}) {
  // The data store has a `d => d.data` transform, so wrap accordingly
  store.setData({ data: {
    regularSchedules: { nodes: [] },
    bankaraSchedules: { nodes: [] },
    xSchedules: { nodes: [] },
    festSchedules: { nodes: [] },
    eventSchedules: { nodes: [] },
    coopGroupingSchedule: {
      regularSchedules: { nodes: regularNodes },
      bigRunSchedules: { nodes: bigRunNodes },
      teamContestSchedules: { nodes: [] },
    },
    vsStages: { nodes: [] },
  } });
}

describe('useSalmonRunSchedulesStore', () => {
  let time;
  let schedulesData;
  let salmonRun;

  beforeEach(() => {
    setActivePinia(createPinia());
    time = useTimeStore();
    schedulesData = useSchedulesDataStore();
  });

  describe('merge', () => {
    it('combines regular and bigRun schedules sorted by startTime', () => {
      setSchedulesData(schedulesData, {
        regularNodes: [
          makeCoopNode({ startTime: '2024-06-15T10:00:00Z', endTime: '2024-06-15T20:00:00Z' }),
        ],
        bigRunNodes: [
          makeCoopNode({ startTime: '2024-06-15T08:00:00Z', endTime: '2024-06-15T18:00:00Z' }),
        ],
      });
      time.setNow(0);
      salmonRun = useSalmonRunSchedulesStore();
      expect(salmonRun.schedules).toHaveLength(2);
      // Should be sorted: bigRun first (08:00), then regular (10:00)
      expect(salmonRun.schedules[0].startTime).toBe('2024-06-15T08:00:00Z');
      expect(salmonRun.schedules[1].startTime).toBe('2024-06-15T10:00:00Z');
    });
  });

  describe('isBigRun', () => {
    it('is true for bigRun nodes', () => {
      setSchedulesData(schedulesData, {
        bigRunNodes: [
          makeCoopNode({ startTime: '2024-06-15T08:00:00Z', endTime: '2024-06-15T18:00:00Z' }),
        ],
      });
      time.setNow(0);
      salmonRun = useSalmonRunSchedulesStore();
      expect(salmonRun.schedules[0].isBigRun).toBe(true);
    });

    it('is false for regular nodes', () => {
      setSchedulesData(schedulesData, {
        regularNodes: [
          makeCoopNode({ startTime: '2024-06-15T08:00:00Z', endTime: '2024-06-15T18:00:00Z' }),
        ],
      });
      time.setNow(0);
      salmonRun = useSalmonRunSchedulesStore();
      expect(salmonRun.schedules[0].isBigRun).toBe(false);
    });
  });

  describe('isMystery', () => {
    it('is true when any weapon has name Random', () => {
      setSchedulesData(schedulesData, {
        regularNodes: [
          makeCoopNode({
            startTime: '2024-06-15T08:00:00Z',
            endTime: '2024-06-15T18:00:00Z',
            weapons: [
              { name: 'Splattershot', __splatoon3ink_id: 'abc' },
              { name: 'Random', __splatoon3ink_id: 'def' },
            ],
          }),
        ],
      });
      time.setNow(0);
      salmonRun = useSalmonRunSchedulesStore();
      expect(salmonRun.schedules[0].isMystery).toBe(true);
    });

    it('is false when no weapon has name Random', () => {
      setSchedulesData(schedulesData, {
        regularNodes: [
          makeCoopNode({
            startTime: '2024-06-15T08:00:00Z',
            endTime: '2024-06-15T18:00:00Z',
            weapons: [
              { name: 'Splattershot', __splatoon3ink_id: 'abc' },
            ],
          }),
        ],
      });
      time.setNow(0);
      salmonRun = useSalmonRunSchedulesStore();
      expect(salmonRun.schedules[0].isMystery).toBe(false);
    });
  });

  describe('isGrizzcoMystery', () => {
    it('is true for specific __splatoon3ink_id values', () => {
      setSchedulesData(schedulesData, {
        regularNodes: [
          makeCoopNode({
            startTime: '2024-06-15T08:00:00Z',
            endTime: '2024-06-15T18:00:00Z',
            weapons: [
              { name: 'Random', __splatoon3ink_id: '6e17fbe20efecca9' },
            ],
          }),
        ],
      });
      time.setNow(0);
      salmonRun = useSalmonRunSchedulesStore();
      expect(salmonRun.schedules[0].isGrizzcoMystery).toBe(true);
    });

    it('is false for other __splatoon3ink_id values', () => {
      setSchedulesData(schedulesData, {
        regularNodes: [
          makeCoopNode({
            startTime: '2024-06-15T08:00:00Z',
            endTime: '2024-06-15T18:00:00Z',
            weapons: [
              { name: 'Random', __splatoon3ink_id: 'other-id' },
            ],
          }),
        ],
      });
      time.setNow(0);
      salmonRun = useSalmonRunSchedulesStore();
      expect(salmonRun.schedules[0].isGrizzcoMystery).toBe(false);
    });
  });

  describe('time filtering', () => {
    it('currentSchedules filters by endTime', () => {
      time.setNow(Date.parse('2024-06-15T12:00:00Z'));
      setSchedulesData(schedulesData, {
        regularNodes: [
          makeCoopNode({ startTime: '2024-06-15T08:00:00Z', endTime: '2024-06-15T10:00:00Z' }), // ended
          makeCoopNode({ startTime: '2024-06-15T10:00:00Z', endTime: '2024-06-15T20:00:00Z' }), // current
        ],
      });
      salmonRun = useSalmonRunSchedulesStore();
      expect(salmonRun.currentSchedules).toHaveLength(1);
      expect(salmonRun.currentSchedules[0].startTime).toBe('2024-06-15T10:00:00Z');
    });

    it('activeSchedule returns schedule where now is between start and end', () => {
      time.setNow(Date.parse('2024-06-15T12:00:00Z'));
      setSchedulesData(schedulesData, {
        regularNodes: [
          makeCoopNode({ startTime: '2024-06-15T10:00:00Z', endTime: '2024-06-15T20:00:00Z' }),
        ],
      });
      salmonRun = useSalmonRunSchedulesStore();
      expect(salmonRun.activeSchedule).toBeDefined();
      expect(salmonRun.activeSchedule.startTime).toBe('2024-06-15T10:00:00Z');
    });

    it('upcomingSchedules filters to future startTime', () => {
      time.setNow(Date.parse('2024-06-15T12:00:00Z'));
      setSchedulesData(schedulesData, {
        regularNodes: [
          makeCoopNode({ startTime: '2024-06-15T10:00:00Z', endTime: '2024-06-15T20:00:00Z' }), // active, not upcoming
          makeCoopNode({ startTime: '2024-06-16T10:00:00Z', endTime: '2024-06-16T20:00:00Z' }), // upcoming
        ],
      });
      salmonRun = useSalmonRunSchedulesStore();
      expect(salmonRun.upcomingSchedules).toHaveLength(1);
      expect(salmonRun.upcomingSchedules[0].startTime).toBe('2024-06-16T10:00:00Z');
    });
  });
});
