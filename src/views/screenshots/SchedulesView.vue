<template>
  <ScreenshotLayout header="Map Schedules">
    <div class="grow flex items-center justify-center">
      <div v-if="activeFestivals.length > 0" class="flex space-x-6 items-center mx-6">
        <div :class="marginsClass">
          <SplatfestMultiBox
            :festivals="activeFestivals"
            class="flex-1 md:-rotate-1"
            :class="`${splatfestSizeClass} ${regionSizeClass}`"
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
import { uniqBy } from 'lodash';
import ScreenshotLayout from '@/layouts/ScreenshotLayout.vue';
import ScreenshotScheduleBox from '@/components/screenshots/ScreenshotScheduleBox.vue';
import ScreenshotTricolorBox from '@/components/screenshots/ScreenshotTricolorBox.vue';
import { useUSSplatfestsStore, useEUSplatfestsStore, useJPSplatfestsStore, useAPSplatfestsStore } from '@/stores/splatfests';
import SplatfestMultiBox from '@/components/SplatfestMultiBox.vue';

const usSplatfests = useUSSplatfestsStore();
const euSplatfests = useEUSplatfestsStore();
const jpSplatfests = useJPSplatfestsStore();
const apSplatfests = useAPSplatfestsStore();
const tricolor = computed(() => usSplatfests.tricolor || euSplatfests.tricolor || jpSplatfests.tricolor || apSplatfests.tricolor);
const activeFestivals = computed(() => uniqBy([usSplatfests.activeFestival, euSplatfests.activeFestival, jpSplatfests.activeFestival, apSplatfests.activeFestival].filter(festival => festival), '__splatoon3ink_id'));
const splatfestSizeClass = computed(() => (tricolor.value?.isTricolorActive || activeFestivals.value?.length > 1) ? 'max-w-xs' : 'max-w-md');
const regionSizeClass = computed(() => (activeFestivals.value?.length > 1) ? '' : 'scale-[1.2]');
const marginsClass = computed(() => (activeFestivals.value?.length <= 1) ? 'mx-10' : '');
</script>
