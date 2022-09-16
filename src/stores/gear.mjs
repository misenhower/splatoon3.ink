import { acceptHMRUpdate, defineStore } from "pinia";
import { computed } from "vue";
import { useGearDataStore } from "./data.mjs";
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
  const normalGear = computed(() => currentNodes(gesotown.value?.limitedGears));

  return { dailyDropBrand, dailyDropGear, normalGear };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useGearStore, import.meta.hot));
}
