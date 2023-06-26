<template>
  <div class="relative">
    <div class="bg-paper absolute inset-0 -z-50" />
    <div class="absolute bottom-0 inset-x-0 -mb-px">
      <img src="@/assets/img/paper-tear-overlay-w.png" />
    </div>

    <div class="absolute top-4 left-4">
      <img src="@/assets/img/staple-left.png" class="w-12" />
    </div>
    <div class="absolute top-4 right-4">
      <img src="@/assets/img/staple-right.png" class="w-12" />
    </div>

    <div class="pb-24 lg:pb-36">
      <div class="text-center pt-4">
        <SquidTape
          class="font-splatoon1 text-4xl text-black rounded-sm -rotate-2 z-10"
          bg="bg-splatoon-orange"
          squid-bg="bg-black"
          border="border-2 border-black"
          squid-size="25px"
        >
          <div class="px-3 py-1">
            Gear on Sale Now
          </div>
        </SquidTape>
      </div>

      <div class="mx-8 space-x-6 flex">
        <div class="w-96 flex justify-center items-center">
          <div class="scale-[1.85]">
            <GearCard v-if="latestGear" class="w-56" :gear="latestGear" />
          </div>
        </div>

        <div class="flex flex-wrap justify-center max-w-2xl">
          <div v-for="gear in gears" :key="gear.id" class="my-4 w-1/3 flex justify-center">
            <GearCard :gear="gear" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGearStore } from '@/stores/gear.mjs';
import { computed } from 'vue';
import GearCard from '@/components/gear/GearCard.vue';
import SquidTape from '@/components/SquidTape.vue';

const gearStore = useGearStore();
const gears = computed(() => gearStore.regularGear?.slice().reverse().slice(1));
const latestGear = computed(() => gearStore.regularGear?.slice().reverse()[0]);
</script>

<style scoped>
.bg-paper {
  background-image: url('@/assets/img/paper-bg.jpg');
  background-size: cover;
  background-repeat: repeat-y;

  mask-image: url('@/assets/img/paper-tear-mask.svg');
  mask-position: bottom;
  mask-size: 100%;
}
</style>
