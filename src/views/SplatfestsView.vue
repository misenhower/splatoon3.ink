<template>
  <MainLayout :title="$t('festival.title')">
    <PageDataState v-slot="{ loading }" :sources="sources">
      <div class="mx-4 md:mx-12 w-full space-y-10">
        <p v-if="!loading && !festivalsWithResults.length" class="py-24 text-center font-splatoon2 text-splatoon-yellow">
          {{ $t('times.checkback') }}
        </p>
        <div v-for="(festival, i) in loading ? [null, null] : festivalsWithResults" :key="festival?.id ?? i" class="flex flex-wrap items-center justify-center gap-y-6 md:gap-x-6">
          <SplatfestBox
            :festival="festival"
            :loading="loading"
            class="w-full max-w-md md:-rotate-1"
            history-mode
          />

          <SplatfestResultsBox
            :festival="festival"
            :loading="loading"
            class="w-full sm:max-w-md md:rotate-1"
          />
        </div>
      </div>
    </PageDataState>
  </MainLayout>
</template>

<script setup>
import PageDataState from '@/components/loading/PageDataState.vue';
import { useFestivalsDataStore } from '@/stores/data.mjs';
import { computed } from 'vue';
import { sortBy, uniqBy } from 'lodash';
import SplatfestBox from '@/components/SplatfestBox.vue';
import SplatfestResultsBox from '@/components/SplatfestResultsBox.vue';
import MainLayout from '@/layouts/MainLayout.vue';
import { useUSSplatfestsStore, useEUSplatfestsStore, useJPSplatfestsStore, useAPSplatfestsStore } from '@/stores/splatfests';

const usSplatfests = useUSSplatfestsStore();
const euSplatfests = useEUSplatfestsStore();
const jpSplatfests = useJPSplatfestsStore();
const apSplatfests = useAPSplatfestsStore();
const festivalsWithResults = computed(() => sortBy(uniqBy([...usSplatfests.festivals, ...euSplatfests.festivals, ...jpSplatfests.festivals, ...apSplatfests.festivals].filter(festival => festival?.hasResults), '__splatoon3ink_id'), 'startTime').reverse());

const sources = [useFestivalsDataStore()];
</script>
