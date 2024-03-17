<template>
  <ScreenshotLayout header="The Daily Drop">
    <div class="grow relative">
      <div class="absolute flex items-center inset-0">
        <div class="ml-40 mt-20">
          <DailyDropGear class="-rotate-1 max-w-2xl scale-[1.4]" />
        </div>
      </div>

      <div class="absolute right-8 top-12 max-w-sm rotate-6">
        <div class="bg-zinc-100 p-2">
          <img v-if="brand" :src="brand.image.url" />
        </div>

        <img class="absolute -top-8 left-28 w-48 -rotate-3" src="@/assets/img/tape/tape-5.png" />
      </div>
    </div>
  </ScreenshotLayout>
</template>

<script setup>
import { computed } from 'vue';
import ScreenshotLayout from '@/layouts/ScreenshotLayout.vue';
import { useGearStore } from '@/stores/gear.mjs';
import DailyDropGear from '@/components/screenshots/DailyDropGear.vue';

const gearStore = useGearStore();
const brand = computed(() => gearStore.dailyDropBrand);
</script>
