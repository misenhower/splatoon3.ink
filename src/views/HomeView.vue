<template>
  <MainLayout :title="$t('schedule.title')">
    <div class="grow flex items-center justify-center">
      <div class="mx-4 md:mx-12 w-full space-y-10">
        <template v-if="activeFestivals.length > 0">
          <template v-if="activeFestivals.length > 1">
            <div class="flex flex-wrap justify-center items-center gap-6">
              <SplatfestBox v-for="festival in activeFestivals" :key="festival.id" :festival="festival" class="md:max-w-md 2xl:max-w-lg md:-rotate-1" />
            </div>
            <div class="flex flex-wrap justify-center items-center gap-6">
              <ScheduleBox type="splatfestOpen" class="md:max-w-md 2xl:max-w-lg md:-rotate-1" />
              <ScheduleBox type="splatfestPro" class="md:max-w-md 2xl:max-w-lg md:-rotate-1" />
              <TricolorBox v-if="isTricolorActive" class="md:max-w-md 2xl:max-w-lg md:rotate-1" />
            </div>
          </template>
          <template v-else>
            <div class="flex flex-wrap justify-center items-center gap-6">
              <SplatfestBox :festival="activeFestivals[0]" class="md:max-w-md 2xl:max-w-lg md:-rotate-1" />
              <ScheduleBox type="splatfestOpen" class="md:max-w-md 2xl:max-w-lg md:-rotate-1" />
              <ScheduleBox type="splatfestPro" class="md:max-w-md 2xl:max-w-lg md:-rotate-1" />
              <TricolorBox v-if="isTricolorActive" class="md:max-w-md 2xl:max-w-lg md:rotate-1" />
            </div>
          </template>
        </template>
        <template v-else>
          <div class="flex flex-wrap justify-center items-center gap-6">
            <ScheduleBox type="regular" class="md:max-w-md 2xl:max-w-lg md:-rotate-1" />
            <ScheduleBox type="anarchySeries" class="md:max-w-md 2xl:max-w-lg md:rotate-1" />
            <ScheduleBox type="anarchyOpen" class="md:max-w-md 2xl:max-w-lg md:-rotate-1" />
            <ScheduleBox type="xMatch" class="md:max-w-md 2xl:max-w-lg md:rotate-1" />

            <SplatfestBox
              v-for="festival in upcomingFestivals"
              :key="festival.id"
              :festival="festival"
              class="md:max-w-md 2xl:max-w-lg md:-rotate-1"
            />
          </div>
        </template>
        <div v-for="festival in recentFestivals" :key="festival.id" class="flex flex-wrap items-center justify-center gap-y-6 md:gap-x-6">
          <SplatfestBox
            :festival="festival"
            class="max-w-md md:-rotate-1"
          />

          <SplatfestResultsBox
            v-if="festival.hasResults"
            :festival="festival"
            class="w-full sm:max-w-md md:rotate-1"
          />
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { computed } from 'vue';
import { uniqBy } from 'lodash';
import ScheduleBox from '@/components/ScheduleBox.vue';
import TricolorBox from '@/components/TricolorBox.vue';
import SplatfestBox from '@/components/SplatfestBox.vue';
import SplatfestResultsBox from '@/components/SplatfestResultsBox.vue';
import { useUSSplatfestsStore, useEUSplatfestsStore, useJPSplatfestsStore, useAPSplatfestsStore } from '@/stores/splatfests';
import MainLayout from '@/layouts/MainLayout.vue';

const usSplatfests = useUSSplatfestsStore();
const euSplatfests = useEUSplatfestsStore();
const jpSplatfests = useJPSplatfestsStore();
const apSplatfests = useAPSplatfestsStore();

const upcomingFestivals = computed(() => uniqBy([usSplatfests.upcomingFestival, euSplatfests.upcomingFestival, jpSplatfests.upcomingFestival, apSplatfests.upcomingFestival].filter(festival => festival), '__splatoon3ink_id'));
const recentFestivals = computed(() => uniqBy([usSplatfests.recentFestival, euSplatfests.recentFestival, jpSplatfests.recentFestival, apSplatfests.recentFestival].filter(festival => festival), '__splatoon3ink_id'));
const activeFestivals = computed(() => uniqBy([usSplatfests.activeFestival, euSplatfests.activeFestival, jpSplatfests.activeFestival, apSplatfests.activeFestival].filter(festival => festival), '__splatoon3ink_id'));
const isTricolorActive = computed(() => usSplatfests.tricolor?.isTricolorActive || euSplatfests.tricolor?.isTricolorActive || jpSplatfests.tricolor?.isTricolorActive || apSplatfests.tricolor?.isTricolorActive);
</script>
