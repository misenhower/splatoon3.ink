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
      <div class="text-center py-4">
        <SquidTape class="font-splatoon1 text-2xl text-black rounded-sm -rotate-2 z-10" bg="bg-splatoon-orange"
          squid-bg="bg-black" border="border border-black" squid-size="15px">
          <div class="px-1">
            {{ $t("gear.sale") }}
          </div>
        </SquidTape>
      </div>

      <template v-if="gears && gears.length">
        <div class="md:hidden px-2">
          <div v-for="gear in gears" :key="gear.id" class="bg-horiz-card">
            <GearCardHorizontal :gear="gear" />
          </div>
        </div>

        <div class="hidden md:block px-2">
          <div class="flex flex-wrap justify-center max-w-3xl">
            <div v-for="gear in gears" :key="gear.id" class="my-6 w-1/3 flex justify-center">
              <GearCard :gear="gear" />
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="h-24 flex items-center justify-center">
          <div class="font-splatoon2 text-black">
            {{ $t('times.checkback') }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { useGearStore } from '@/stores/gear.mjs';
import { computed } from 'vue';
import GearCard from './GearCard.vue';
import GearCardHorizontal from './GearCardHorizontal.vue';
import SquidTape from '../SquidTape.vue';

const gearStore = useGearStore();
const gears = computed(() => gearStore.regularGear);
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

.bg-horiz-card {
  background-image: url('@/assets/img/gesotown-horiz-card-bg.png');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: center;
}
</style>
