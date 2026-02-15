import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTimeStore } from './time.mjs';
import { useGearDataStore } from './data.mjs';
import { useGearStore } from './gear.mjs';

function setGearData(store, gesotown) {
  // The data store has a `d => d.data` transform, so wrap accordingly
  store.setData({ data: { gesotown } });
}

describe('useGearStore', () => {
  let time;
  let gearData;
  let gear;

  beforeEach(() => {
    setActivePinia(createPinia());
    time = useTimeStore();
    gearData = useGearDataStore();
  });

  describe('dailyDropBrand', () => {
    it('returns brand when saleEndTime is in the future', () => {
      time.setNow(Date.parse('2024-06-15T12:00:00Z'));
      setGearData(gearData, {
        pickupBrand: { saleEndTime: '2024-06-16T00:00:00Z', brandGears: [] },
        limitedGears: [],
      });
      gear = useGearStore();
      expect(gear.dailyDropBrand).toBeDefined();
      expect(gear.dailyDropBrand.saleEndTime).toBe('2024-06-16T00:00:00Z');
    });

    it('returns null when saleEndTime is in the past', () => {
      time.setNow(Date.parse('2024-06-17T00:00:00Z'));
      setGearData(gearData, {
        pickupBrand: { saleEndTime: '2024-06-16T00:00:00Z', brandGears: [] },
        limitedGears: [],
      });
      gear = useGearStore();
      expect(gear.dailyDropBrand).toBeNull();
    });
  });

  describe('dailyDropGear', () => {
    it('filters to only current gear items', () => {
      time.setNow(Date.parse('2024-06-15T12:00:00Z'));
      setGearData(gearData, {
        pickupBrand: {
          saleEndTime: '2024-06-16T00:00:00Z',
          brandGears: [
            { id: 1, saleEndTime: '2024-06-16T00:00:00Z' },
            { id: 2, saleEndTime: '2024-06-14T00:00:00Z' }, // expired
            { id: 3, saleEndTime: '2024-06-16T00:00:00Z' },
          ],
        },
        limitedGears: [],
      });
      gear = useGearStore();
      expect(gear.dailyDropGear).toHaveLength(2);
      expect(gear.dailyDropGear.map(g => g.id)).toEqual([1, 3]);
    });
  });

  describe('regularGear', () => {
    it('filters limitedGears by current time', () => {
      time.setNow(Date.parse('2024-06-15T12:00:00Z'));
      setGearData(gearData, {
        pickupBrand: { saleEndTime: '2024-06-16T00:00:00Z', brandGears: [] },
        limitedGears: [
          { id: 'a', saleEndTime: '2024-06-16T00:00:00Z' },
          { id: 'b', saleEndTime: '2024-06-14T00:00:00Z' }, // expired
        ],
      });
      gear = useGearStore();
      expect(gear.regularGear).toHaveLength(1);
      expect(gear.regularGear[0].id).toBe('a');
    });
  });
});
