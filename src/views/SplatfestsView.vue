<template>
  <MainLayout :title="$t('festival.title')">
    <div class="grow flex items-center justify-center">
      <div class="mx-4 md:mx-12 w-full space-y-10">
        <div v-for="festival in festivalsWithResults" :key="festival.id" class="flex flex-wrap items-center justify-center gap-y-6 md:gap-x-6">
          <SplatfestBox
            :festival="festival"
            class="max-w-md md:-rotate-1"
            history-mode
          />

          <SplatfestResultsBox
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
import { sortBy, uniqBy } from 'lodash';
import SplatfestBox from '../components/SplatfestBox.vue';
import SplatfestResultsBox from '../components/SplatfestResultsBox.vue';
import MainLayout from '@/layouts/MainLayout.vue';
import { useUSSplatfestsStore, useEUSplatfestsStore, useJPSplatfestsStore, useAPSplatfestsStore } from '@/stores/splatfests';

const usSplatfests = useUSSplatfestsStore();
const euSplatfests = useEUSplatfestsStore();
const jpSplatfests = useJPSplatfestsStore();
const apSplatfests = useAPSplatfestsStore();
const festivalsWithResults = computed(() => sortBy(uniqBy([...usSplatfests.festivals, ...euSplatfests.festivals, ...jpSplatfests.festivals, ...apSplatfests.festivals].filter(festival => festival?.hasResults), '__splatoon3ink_id'), 'startTime').reverse());

</script>
