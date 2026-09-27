import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('endpoint loading states', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('distinguishes an initial request from a successfully loaded empty result', async () => {
    let resolveResponse;
    vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => {
      resolveResponse = resolve;
    })));
    const store = useGearDataStore();

    expect(store.data).toBe(null);
    expect(store.error).toBe(null);

    const request = store.update();
    expect(store.isUpdating).toBe(true);
    expect(store.data).toBe(null);

    resolveResponse(new Response(JSON.stringify({ data: { gesotown: null } })));
    await request;

    expect(store.data).toEqual({ gesotown: null });
    expect(store.isUpdating).toBe(false);
    expect(store.error).toBe(null);
  });

  it.each([
    ['HTTP error', () => Promise.resolve(new Response('', { status: 503 }))],
    ['network error', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['invalid JSON', () => Promise.resolve(new Response('not JSON'))],
    ['missing payload', () => Promise.resolve(new Response('{}'))],
  ])('exposes %s and recovers on retry', async (_name, fail) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetch = vi.fn(fail);
    vi.stubGlobal('fetch', fetch);
    const store = useGearDataStore();

    await store.update();

    expect(store.data).toBe(null);
    expect(store.error).toBeTruthy();
    expect(store.isUpdating).toBe(false);

    fetch.mockResolvedValue(new Response(JSON.stringify({ data: { gesotown: null } })));
    const retry = store.update();
    expect(store.error).toBe(null);
    await retry;

    expect(store.data).toEqual({ gesotown: null });
    expect(store.error).toBe(null);
  });

  it('keeps the last successful data during and after a failed refresh', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Offline')));
    const store = useGearDataStore();
    store.setData({ data: { gesotown: { limitedGears: [] } } });

    const refresh = store.update();
    expect(store.data).toEqual({ gesotown: { limitedGears: [] } });
    await refresh;

    expect(store.data).toEqual({ gesotown: { limitedGears: [] } });
    expect(store.error).toBeTruthy();
  });

  it('shares an in-flight request with retries and background updates', async () => {
    let resolveResponse;
    const fetch = vi.fn(() => new Promise(resolve => {
      resolveResponse = resolve;
    }));
    vi.stubGlobal('fetch', fetch);
    const store = useGearDataStore();

    const first = store.update();
    const second = store.update();
    expect(fetch).toHaveBeenCalledTimes(1);

    resolveResponse(new Response(JSON.stringify({ data: {} })));
    await Promise.all([first, second]);
    expect(store.isUpdating).toBe(false);
  });
});
