import { acceptHMRUpdate, defineStore } from "pinia";
import { computed } from "vue";
import { useFestivalsDataStore } from "./data.mjs";
import { useTimeStore } from "./time.mjs";

export const STATUS_PAST = 'past';
export const STATUS_ACTIVE = 'active';
export const STATUS_UPCOMING = 'upcoming';

function defineSplatfestRegionStore(region) {
  return defineStore(`splatfests/${region}`, () => {
    const time = useTimeStore();
    const store = useFestivalsDataStore();

    function getStatus(node) {
      switch (true) {
        case time.isActive(node.startTime, node.endTime):
          return STATUS_ACTIVE;
        case time.isUpcoming(node.startTime):
          return STATUS_UPCOMING;
        default:
          return STATUS_PAST;
      }
    }

    const festivals = computed(() => store.data?.[region]?.data.festRecords.nodes.map(node => {
      return {
        ...node,
        status: getStatus(node),
      };
    }));

    const previousFestivals = computed(() => festivals.value?.filter(f => f.status === STATUS_PAST));
    const activeFestival = computed(() => festivals.value?.find(f => f.status === STATUS_ACTIVE));
    const upcomingFestival = computed(() => festivals.value?.find(f => f.status === STATUS_UPCOMING))

    return { festivals, previousFestivals, activeFestival, upcomingFestival };
  });
}

export const useUSSplatfestsStore = defineSplatfestRegionStore('US');
export const useEUSplatfestsStore = defineSplatfestRegionStore('EU');
export const useJPSplatfestsStore = defineSplatfestRegionStore('JP');
export const useAPSplatfestsStore = defineSplatfestRegionStore('AP');

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUSSplatfestsStore, import.meta.hot));
  import.meta.hot.accept(acceptHMRUpdate(useEUSplatfestsStore, import.meta.hot));
  import.meta.hot.accept(acceptHMRUpdate(useJPSplatfestsStore, import.meta.hot));
  import.meta.hot.accept(acceptHMRUpdate(useAPSplatfestsStore, import.meta.hot));
}
