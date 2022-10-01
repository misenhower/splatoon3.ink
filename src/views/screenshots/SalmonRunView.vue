<template>
  <ScreenshotLayout header="Salmon Run">
    <div class="grow flex items-center justify-center">
      <div class="max-w-2xl scale-[1.6]">
        <SalmonRunBox class="-rotate-1" />
      </div>
    </div>
  </ScreenshotLayout>
</template>

<script setup>
import ScreenshotLayout from '../../layouts/ScreenshotLayout.vue';
import DailyDropGear from '@/components/screenshots/DailyDropGear.vue';
import { useGearStore } from '../../stores/gear.mjs';
import { computed } from 'vue';
import SalmonRunBox from '../../components/salmonrun/SalmonRunBox.vue';

const gearStore = useGearStore();
const brand = computed(() => gearStore.dailyDropBrand);
</script>
