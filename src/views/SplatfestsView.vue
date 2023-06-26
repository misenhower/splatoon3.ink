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
import MainLayout from '@/layouts/MainLayout.vue'

import { useUSSplatfestsStore } from '@/stores/splatfests';
import SplatfestBox from '../components/SplatfestBox.vue';
import SplatfestResultsBox from '../components/SplatfestResultsBox.vue';
const usSplatfests = useUSSplatfestsStore();
const festivalsWithResults = computed(() => usSplatfests.festivals?.filter(f => f.hasResults));

</script>
