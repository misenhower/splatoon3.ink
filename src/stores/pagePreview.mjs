import { defineStore } from 'pinia';

export const usePagePreviewStore = import.meta.env?.DEV
  ? defineStore('debug/pagePreview', {
    state: () => ({ mode: 'live' }),
  })
  : null;

const emptyData = {
  schedules: {
    currentFest: null,
    regularSchedules: { nodes: [] },
    bankaraSchedules: { nodes: [] },
    xSchedules: { nodes: [] },
    festSchedules: { nodes: [] },
    eventSchedules: { nodes: [] },
    vsStages: { nodes: [] },
    coopGroupingSchedule: {
      regularSchedules: { nodes: [] },
      bigRunSchedules: { nodes: [] },
      teamContestSchedules: { nodes: [] },
    },
  },
  gear: { gesotown: { pickupBrand: null, limitedGears: [] } },
  coop: { coopResult: { monthlyGear: null } },
  festivals: {},
};

export function getEmptyPreviewData(endpoint) {
  return emptyData[endpoint];
}
