import { acceptHMRUpdate, defineStore } from "pinia";
import { computed } from "vue";
import { useSchedulesDataStore } from "./data.mjs";
import { useTimeStore } from "./time.mjs";
import sortBy from 'lodash/sortBy.js';
import min from 'lodash/min.js';
import max from 'lodash/max.js';

// Schedule store definition (used for each type of schedule)
function defineScheduleStore(id, options) {
  return defineStore(`schedules/${id}`, () => {
    const transform = (node) => {
      node = {
        ...node,
        settings: options.settings(node),
      };

      // Move the thumbnail image to "thumbnailImage" and pull in the high-res image for the stage
      for (let stage of node.settings?.vsStages || []) {
        stage.thumbnailImage = stage.image;
        stage.image = findStageImage(stage.id) || stage.image;
      }

      return node;
    };

    const time = useTimeStore();
    const schedules = computed(() => options.nodes()?.map(n => transform(n)));

    const currentSchedules = computed(() => schedules.value?.filter(s => time.isCurrent(s.endTime)));
    const activeSchedule = computed(() => schedules.value?.find(s => time.isActive(s.startTime, s.endTime)));
    const upcomingSchedules = computed(() => schedules.value?.filter(s => time.isUpcoming(s.startTime)));

    return { schedules, currentSchedules, activeSchedule, upcomingSchedules };
  });
}

function findStageImage(id) {
  return useSchedulesDataStore().data
    ?.vsStages.nodes.find(s => s.id === id)
    ?.originalImage;
}

// Regular Battle
export const useRegularSchedulesStore = defineScheduleStore('regular', {
  nodes: () => useSchedulesDataStore().data?.regularSchedules.nodes,
  settings: node => node.regularMatchSetting,
});

// Anarchy Battle (Series)
export const useAnarchySeriesSchedulesStore = defineScheduleStore('anarchy/series', {
  nodes: () => useSchedulesDataStore().data?.bankaraSchedules.nodes,
  settings: node => node.bankaraMatchSettings?.find(s => s.mode === 'CHALLENGE'),
});

// Anarchy Battle (Open)
export const useAnarchyOpenSchedulesStore = defineScheduleStore('anarchy/open', {
  nodes: () => useSchedulesDataStore().data?.bankaraSchedules.nodes,
  settings: node => node.bankaraMatchSettings?.find(s => s.mode === 'OPEN'),
});

// X Battle
export const useXSchedulesStore = defineScheduleStore('xmatch', {
  nodes: () => useSchedulesDataStore().data?.xSchedules.nodes,
  settings: node => node.xMatchSetting,
});

// Splatfest Battle
export const useSplatfestSchedulesStore = defineScheduleStore('splatfest', {
  nodes: () => useSchedulesDataStore().data?.festSchedules.nodes,
  settings: node => node.festMatchSetting,
});

// Challenge Events
export const useEventSchedulesStore = defineScheduleStore('event', {
  nodes: () => useSchedulesDataStore().data?.eventSchedules.nodes.map(node => ({
    // Find the overall start/end times for the event based on all time periods
    startTime: min(node.timePeriods.map(t => t.startTime)),
    endTime: max(node.timePeriods.map(t => t.endTime)),
    ...node,
  })),
  settings: node => node.leagueMatchSetting,
});

// Salmon Run
export const useSalmonRunSchedulesStore = defineScheduleStore('salmonRun', {
  nodes: () => {
    const data = useSchedulesDataStore().data;

    // Combine Salmon Run and Big Run schedules
    let nodes = []
      .concat(data?.coopGroupingSchedule.regularSchedules.nodes.map(n => ({ ...n, isBigRun: false })))
      .concat(data?.coopGroupingSchedule.bigRunSchedules.nodes.map(n => ({ ...n, isBigRun: true })))
      .filter(n => n)
      .map(n => ({
        ...n,
        isMystery: n.setting.weapons.some(w => w.name === 'Random'),
        isGrizzcoMystery: n.setting.weapons.some(w => w.__splatoon3ink_id === '6e17fbe20efecca9'),
      }));

    return sortBy(nodes, 'startTime');
  },
  settings: node => node.setting,
});

// Eggstra Work
export const useEggstraWorkSchedulesStore = defineScheduleStore('eggstraWork', {
  nodes: () => useSchedulesDataStore().data?.coopGroupingSchedule.teamContestSchedules.nodes || [],
  settings: node => node.setting,
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useRegularSchedulesStore, import.meta.hot));
  import.meta.hot.accept(acceptHMRUpdate(useAnarchySeriesSchedulesStore, import.meta.hot));
  import.meta.hot.accept(acceptHMRUpdate(useAnarchyOpenSchedulesStore, import.meta.hot));
  import.meta.hot.accept(acceptHMRUpdate(useXSchedulesStore, import.meta.hot));
  import.meta.hot.accept(acceptHMRUpdate(useSplatfestSchedulesStore, import.meta.hot));
  import.meta.hot.accept(acceptHMRUpdate(useEventSchedulesStore, import.meta.hot));
  import.meta.hot.accept(acceptHMRUpdate(useSalmonRunSchedulesStore, import.meta.hot));
  import.meta.hot.accept(acceptHMRUpdate(useEggstraWorkSchedulesStore, import.meta.hot));
}
