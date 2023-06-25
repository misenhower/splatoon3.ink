<template>
  <MainLayout :title="$t('schedule.title')">
    <div class="grow flex items-center justify-center">
      <div class="mx-4 md:mx-12 w-full space-y-10">
        <div class="flex flex-wrap justify-center items-center gap-6">
          <template v-if="usSplatfests.activeFestival">
            <SplatfestBox :festival="usSplatfests.activeFestival" class="max-w-md md:-rotate-1" />
            <ScheduleBox type="splatfest" class="max-w-lg md:rotate-1" />
          </template>

          <template v-else>
            <ScheduleBox type="regular" class="md:max-w-lg md:-rotate-1" />
            <ScheduleBox type="anarchySeries" class="md:max-w-lg md:rotate-1" />
            <ScheduleBox type="anarchyOpen" class="md:max-w-lg md:-rotate-1" />
            <ScheduleBox type="xMatch" class="md:max-w-lg md:rotate-1" />
          </template>
        </div>

        <div class="flex justify-center" v-if="usSplatfests.upcomingFestival">
          <SplatfestBox
            :festival="usSplatfests.upcomingFestival"
            class="flex-1 max-w-md md:-rotate-1"
            />
        </div>

        <div class="flex flex-wrap items-center justify-center gap-y-6 md:gap-x-6" v-if="usSplatfests.recentFestival">
          <SplatfestBox
            :festival="usSplatfests.recentFestival"
            class="max-w-md md:-rotate-1"
            />

          <SplatfestResultsBox
            v-if="usSplatfests.recentFestival.hasResults"
            :festival="usSplatfests.recentFestival"
            class="w-full sm:max-w-md md:rotate-1"
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
