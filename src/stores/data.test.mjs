import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  useCoopDataStore,
  useDataStore,
  useFestivalsDataStore,
  useGearDataStore,
  useSchedulesDataStore,
} from './data.mjs';

describe('useDataStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('becomes loaded only after every initial data source has content', () => {
    let data = useDataStore();

    expect(data.isLoaded).toBe(false);

    useSchedulesDataStore().setData({ data: {} });
    useGearDataStore().setData({ data: {} });
    useCoopDataStore().setData({ data: {} });
    expect(data.isLoaded).toBe(false);

    useFestivalsDataStore().setData({});
    expect(data.isLoaded).toBe(true);
  });
});
