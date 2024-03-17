import { acceptHMRUpdate, defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

// Endpoint store definition (used for each individual data endpoint)
function defineEndpointStore(id, endpoint, transform = null) {
  return defineStore(`data/${id}`, () => {
    const data = shallowRef(null);
    const isUpdating = ref(false);

    async function update() {
      isUpdating.value = true;

      try {
        let baseUrl = import.meta.env.VITE_DATA_FROM || '';
        let response = await fetch(baseUrl + endpoint);

        if (!response.ok) {
          console.error(response);

          return;
        }

        let json = await response.json();

        setData(json);
      } finally {
        isUpdating.value = false;
      }
    }

    function setData(json) {
      if (transform) {
        json = transform(json);
      }

      data.value = json;
    }

    return { data, update, setData, isUpdating };
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
  let updateDataTimer;

  function updateAll() {
    return Promise.all(Object.values(stores).map(s => s.update()));
  }

  const isUpdating = computed(() => Object.values(stores).some(s => s.isUpdating));

  function startUpdating() {
    if (updateDataTimer) {
      return;
    }

    updateAll();

    let date = new Date;

    // If we're more than 20 seconds past the current hour, schedule the update for the next hour
    if (date.getMinutes() !== 0 || date.getSeconds() >= 20)
      date.setHours(date.getHours() + 1);
    date.setMinutes(0);

    // Random number of seconds past the hour (so all open browsers don't hit the server at the same time)
    let minSec = 25;
    let maxSec = 60;
    date.setSeconds(Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec);

    // Set the timeout
    updateDataTimer = setTimeout(() => {
      updateDataTimer = null;
      startUpdating();
    }, (date - new Date));
  }

  function stopUpdating() {
    clearInterval(updateDataTimer);
    updateDataTimer = null;
  }

  return {
    updateAll,
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
