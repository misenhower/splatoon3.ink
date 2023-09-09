<template>
  <ScreenshotLayout header="Map Schedules">
    <div class="grow flex items-center justify-center">
      <div v-if="usSplatfests.activeFestival" class="flex space-x-6 items-center mx-6">
        <div class="mx-10">
          <SplatfestBox
            :festival="usSplatfests.activeFestival"
            class="flex-1 md:-rotate-1 scale-[1.2]"
            :class="splatfestSizeClass"
          />
        </div>
        <ScreenshotScheduleBox type="splatfestOpen" class="flex-1 rotate-1" />
        <ScreenshotScheduleBox type="splatfestPro" class="flex-1 -rotate-1" />
        <ScreenshotTricolorBox v-if="tricolor?.isTricolorActive" class="flex-1 rotate-1" />
      </div>

      <div v-else class="flex space-x-6 mx-6">
        <ScreenshotScheduleBox type="regular" class="flex-1 -rotate-1" />
        <ScreenshotScheduleBox type="anarchySeries" class="flex-1 rotate-1" />
        <ScreenshotScheduleBox type="anarchyOpen" class="flex-1 -rotate-1" />
        <ScreenshotScheduleBox type="xMatch" class="flex-1 rotate-1" />
      </div>
    </div>
  </ScreenshotLayout>
</template>

<script setup>
import { computed } from 'vue';
import ScreenshotLayout from '../../layouts/ScreenshotLayout.vue';
import ScreenshotScheduleBox from '../../components/screenshots/ScreenshotScheduleBox.vue';

import { useUSSplatfestsStore } from '@/stores/splatfests';
import SplatfestBox from '@/components/SplatfestBox.vue';
import ScreenshotTricolorBox from '../../components/screenshots/ScreenshotTricolorBox.vue';
const usSplatfests = useUSSplatfestsStore();
const tricolor = computed(() => usSplatfests.tricolor);
const splatfestSizeClass = computed(() => (tricolor.value?.isTricolorActive) ? 'max-w-xs' : 'max-w-md');
</script>
