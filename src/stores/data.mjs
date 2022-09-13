import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue';

// Endpoint store definition (used for each individual data endpoint)
function defineEndpointStore(id, endpoint, transform = null) {
  return defineStore(`data/${id}`, () => {
    const data = shallowRef(null);
    const isUpdating = ref(false);

    async function update() {
      isUpdating.value = true;

      try {
        let response = await fetch(endpoint);

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

export const useSchedulesStore = defineEndpointStore('schedules', '/data/schedules.json', d => d.data);
export const useGearStore = defineEndpointStore('gear', '/data/gear.json', d => d.data);

export const useDataStore = defineStore('data', () => {
  const stores = {
    schedules: useSchedulesStore(),
    gear: useGearStore(),
  };

  function updateAll() {
    return Promise.all(Object.values(stores).map(s => s.update()));
  }

  const isUpdating = computed(() => Object.values(stores).some(s => s.isUpdating));

  return {
    updateAll,
    isUpdating,
    schedules: computed(() => stores.schedules.data),
    gear: computed(() => stores.gear.data),
  }
});


if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDataStore, import.meta.hot));
}
