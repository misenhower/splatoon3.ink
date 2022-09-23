<template>
  <ScreenshotLayout header="Map Schedules">
    <div class="grow flex items-center justify-center">
      <div class="flex space-x-12 items-center mx-6" v-if="usSplatfests.activeFestival">
        <div class="mx-10">
            <SplatfestBox
              :festival="usSplatfests.activeFestival"
              class="flex-1 max-w-md md:-rotate-1 scale-[1.2]"
              />
        </div>
        <ScreenshotScheduleBox type="splatfest" class="flex-1 rotate-1" />
      </div>
      <div class="flex space-x-6 mx-6" v-else>
        <ScreenshotScheduleBox type="regular" class="flex-1 -rotate-1" />
        <ScreenshotScheduleBox type="anarchySeries" class="flex-1 rotate-1" />
        <ScreenshotScheduleBox type="anarchyOpen" class="flex-1 -rotate-1" />
      </div>
    </div>
  </ScreenshotLayout>
</template>

<script setup>
import ScreenshotLayout from '../../layouts/ScreenshotLayout.vue';
import ScreenshotScheduleBox from '../../components/screenshots/ScreenshotScheduleBox.vue';

import { useUSSplatfestsStore } from '@/stores/splatfests';
import SplatfestBox from '@/components/SplatfestBox.vue';
const usSplatfests = useUSSplatfestsStore();
</script>
