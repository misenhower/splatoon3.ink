import { acceptHMRUpdate, defineStore } from 'pinia';
import { computed } from 'vue';
import { useFestivalsDataStore, useSchedulesDataStore } from './data.mjs';
import { useTimeStore } from './time.mjs';

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

    function getRegions(node) {
      let result = [];
      const regions = node.__splatoon3ink_id.split('-')[0];

      // The order here is important for SplatfestStatus/SplatfestResultsStatus posts
      if (regions.includes('U')) result.push('NA');
      if (regions.includes('J')) result.push('JP');
      if (regions.includes('E')) result.push('EU');
      if (regions.includes('A')) result.push('AP');

      return result;
    }

    const festivals = computed(() => store.data?.[region]?.data.festRecords.nodes.map(node => {
      return {
        ...node,
        status: getStatus(node),
        hasResults: node.teams.some(t => t.result),
        regions: getRegions(node),
      };
    }));

    const previousFestivals = computed(() => festivals.value?.filter(f => f.status === STATUS_PAST));
    const activeFestival = computed(() => festivals.value?.find(f => f.status === STATUS_ACTIVE));
    const upcomingFestival = computed(() => festivals.value?.find(f => f.status === STATUS_UPCOMING));

    // A "recent festival" is one that ended within the past 3 days
    const recentFestival = computed(() => festivals.value?.find(f =>
      f.status === STATUS_PAST &&
      time.now - Date.parse(f.endTime) < 3 * 24 * 60 * 60 * 1000,
    ));

    // TODO: Eventually this needs to be handled on a per-region basis.
    const tricolor = computed(() => {
      let {currentFest: fest, vsStages} = useSchedulesDataStore().data ?? {};

      if (!fest) {
        return null;
      }

      // Move the thumbnail image to "thumbnailImage" and pull in the high-res image for the stage
      if (!('thumbnailImage' in fest.tricolorStage)) {
        fest.tricolorStage.thumbnailImage = fest.tricolorStage.image;
        fest.tricolorStage.image =
          vsStages.nodes.find(s => s.id === fest.tricolorStage.id)?.originalImage ||
          fest.tricolorStage.image;
      }

      return {
        ...fest,
        isTricolorActive: time.isActive(fest.midtermTime, fest.endTime),
        startTime: fest.midtermTime,
        endTime: fest.endTime,
      };
    });

    return { festivals, previousFestivals, activeFestival, upcomingFestival, recentFestival, tricolor };
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
