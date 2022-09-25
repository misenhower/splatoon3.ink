<template>
  <MainLayout title="Map Schedules">
    <div class="grow flex items-center justify-center">
      <div class="mx-4 md:mx-12 max-w-screen-2xl w-full space-y-10">
        <div class="flex flex-col space-y-6 md:flex-row md:space-x-6 md:space-y-0 justify-center" v-if="usSplatfests.activeFestival">
          <div>
            <SplatfestBox :festival="usSplatfests.activeFestival" class="flex-1 max-w-md md:-rotate-1" />
          </div>
          <ScheduleBox type="splatfest" class="flex-1 max-w-lg md:rotate-1" />
        </div>
        <div class="flex flex-col space-y-6 md:flex-row md:space-x-6 md:space-y-0" v-else>
          <ScheduleBox type="regular" class="flex-1 md:-rotate-1" />
          <ScheduleBox type="anarchySeries" class="flex-1 md:rotate-1" />
          <ScheduleBox type="anarchyOpen" class="flex-1 md:-rotate-1" />
        </div>

        <div class="flex justify-center" v-if="usSplatfests.upcomingFestival">
          <SplatfestBox
            :festival="usSplatfests.upcomingFestival"
            class="flex-1 max-w-md md:-rotate-1"
            />
        </div>

        <div class="flex items-center justify-center flex-col space-y-6 md:flex-row md:space-x-6 md:space-y-0" v-if="usSplatfests.recentFestival">
          <SplatfestBox
            :festival="usSplatfests.recentFestival"
            class="max-w-md md:-rotate-1"
            />

          <SplatfestResultsBox
            v-if="usSplatfests.recentFestival.hasResults"
            :festival="usSplatfests.recentFestival"
            class="max-w-md md:rotate-1"
            />
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import MainLayout from '@/layouts/MainLayout.vue'
import ScheduleBox from '../components/ScheduleBox.vue';

import { useUSSplatfestsStore } from '@/stores/splatfests';
import SplatfestBox from '../components/SplatfestBox.vue';
import SplatfestResultsBox from '../components/SplatfestResultsBox.vue';
const usSplatfests = useUSSplatfestsStore();
</script>
