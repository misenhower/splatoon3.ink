import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useGearDataStore, useSchedulesDataStore } from './data.mjs';
import { usePagePreviewStore } from './pagePreview.mjs';
import { useGearStore } from './gear.mjs';
import {
  useRegularSchedulesStore,
  useAnarchySeriesSchedulesStore,
  useAnarchyOpenSchedulesStore,
  useXSchedulesStore,
  useEventSchedulesStore,
  useSalmonRunSchedulesStore,
  useEggstraWorkSchedulesStore,
} from './schedules.mjs';
import { useUSSplatfestsStore } from './splatfests.mjs';

describe('page state preview', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('provides valid empty results for every data page before requests complete', () => {
    usePagePreviewStore().mode = 'empty';

    expect(useGearDataStore().data).not.toBeNull();
    expect(useSchedulesDataStore().data).not.toBeNull();
    expect(useGearStore().dailyDropBrand).toBeNull();
    expect(useGearStore().regularGear).toEqual([]);
    expect(useUSSplatfestsStore().festivals).toEqual([]);

    const scheduleStores = [
      useRegularSchedulesStore,
      useAnarchySeriesSchedulesStore,
      useAnarchyOpenSchedulesStore,
      useXSchedulesStore,
      useEventSchedulesStore,
      useSalmonRunSchedulesStore,
      useEggstraWorkSchedulesStore,
    ];

    for (const useStore of scheduleStores) {
      expect(useStore().currentSchedules).toEqual([]);
      expect(useStore().activeSchedule).toBeUndefined();
    }
  });

  it('holds the empty preview through data updates and restores the latest live data', () => {
    const preview = usePagePreviewStore();
    const gear = useGearDataStore();
    gear.setData({ data: { version: 1 } });

    preview.mode = 'empty';
    gear.setData({ data: { version: 2 } });
    expect(gear.data.gesotown.limitedGears).toEqual([]);

    preview.mode = 'live';
    expect(gear.data).toEqual({ version: 2 });
  });

  it('restores the pending state when leaving an empty preview without live data', () => {
    const preview = usePagePreviewStore();
    const gear = useGearDataStore();

    preview.mode = 'empty';
    expect(gear.data).not.toBeNull();

    preview.mode = 'live';
    expect(gear.data).toBeNull();
    expect(gear.error).toBeNull();
  });
});
