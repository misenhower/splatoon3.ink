import { acceptHMRUpdate, defineStore } from "pinia";
import { computed } from "vue";
import { useCoopDataStore, useGearDataStore } from "./data.mjs";
import { useTimeStore } from "./time.mjs";

function whenCurrent(node) {
  const time = useTimeStore();

  return time.isCurrent(node?.saleEndTime)
    ? node
    : null;
}

function currentNodes(nodes) {
  return nodes?.filter(n => whenCurrent(n));
}

export const useGearStore = defineStore('gear', () => {
  const gear = useGearDataStore();
  const gesotown = computed(() => gear.data?.gesotown);

  const dailyDropBrand = computed(() => whenCurrent(gesotown.value?.pickupBrand));
  const dailyDropGear = computed(() => currentNodes(gesotown.value?.pickupBrand.brandGears));
  const regularGear = computed(() => currentNodes(gesotown.value?.limitedGears));

  return { dailyDropBrand, dailyDropGear, regularGear };
});

export const useCoopGearStore = defineStore('coopGear', () => {
  const coop = useCoopDataStore();

  const monthlyGear = computed(() => coop.data?.coopResult?.monthlyGear);

  return { monthlyGear };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useGearStore, import.meta.hot));
}
