import { acceptHMRUpdate, defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

// Endpoint store definition (used for each individual data endpoint)
function defineEndpointStore(id, endpoint, transform = null) {
  return defineStore(`data/${id}`, () => {
    const data = shallowRef(null);
    const isUpdating = ref(false);
    const error = ref(null);
    let pending;

    function update() {
      if (pending) return pending;

      isUpdating.value = true;
      error.value = null;

      pending = fetchData().finally(() => {
        isUpdating.value = false;
        pending = null;
      });

      return pending;
    }

    async function fetchData() {
      try {
        let baseUrl = import.meta.env.VITE_DATA_FROM || '';
        let response = await fetch(baseUrl + endpoint);

        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }

        let json = await response.json();

        setData(json);
      } catch (cause) {
        error.value = cause instanceof Error ? cause.message : String(cause);
        console.error(`Failed to fetch ${endpoint}: ${error.value}`);
      }
    }

    function setData(json) {
      if (transform) {
        json = transform(json);
      }

      if (json === null || typeof json !== 'object') {
        throw new Error('Missing data payload');
      }

      data.value = json;
      error.value = null;
    }

    return { data, update, setData, isUpdating, error };
  });
}

export const useSchedulesDataStore = defineEndpointStore('schedules', '/data/schedules.json', d => d.data);
export const useGearDataStore = defineEndpointStore('gear', '/data/gear.json', d => d.data);
export const useCoopDataStore = defineEndpointStore('coop', '/data/coop.json', d => d.data);
export const useFestivalsDataStore = defineEndpointStore('festivals', '/data/festivals.json');

export const useDataStore = defineStore('data', () => {
  const stores = {
    schedules: useSchedulesDataStore(),
    gear: useGearDataStore(),
    coop: useCoopDataStore(),
    festivals: useFestivalsDataStore(),
  };
  let refreshTimer;
  let lastRefresh = 0;

  function updateAll() {
    return Promise.all(Object.values(stores).map(s => s.update()));
  }

  const isUpdating = computed(() => Object.values(stores).some(s => s.isUpdating));
  const isLoaded = computed(() => Object.values(stores).every(s => s.data !== null));

  function refresh() {
    const now = Date.now();
    if (now - lastRefresh < 60_000) return;
    lastRefresh = now;
    updateAll();
  }

  function msUntilNextHour() {
    const next = new Date();
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    return next - new Date();
  }

  function scheduleNextRefresh() {
    const fiveMinutes = 5 * 60_000;
    const jitter = Math.floor(Math.random() * 36 + 25) * 1000;
    const untilHour = msUntilNextHour() + jitter;
    const delay = Math.min(fiveMinutes, untilHour);

    refreshTimer = setTimeout(() => {
      refresh();
      scheduleNextRefresh();
    }, delay);
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      refresh();
    }
  }

  function startUpdating() {
    if (refreshTimer) return;
    refresh();
    scheduleNextRefresh();
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  function stopUpdating() {
    clearTimeout(refreshTimer);
    refreshTimer = null;
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }

  return {
    updateAll,
    isLoaded,
    isUpdating,
    startUpdating,
    stopUpdating,
    schedules: computed(() => stores.schedules.data),
    gear: computed(() => stores.gear.data),
    coop: computed(() => stores.coop.data),
    festivals: computed(() => stores.festivals.data),
  };
});


if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDataStore, import.meta.hot));
}
