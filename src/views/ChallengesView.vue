<template>
  <MainLayout :title="$t('events.title')">
    <div class="grow flex items-center justify-center">
      <div class="mx-4 md:mx-12 max-w-screen-2xl w-full space-y-10">
        <div v-if="store.currentSchedules?.length" class="flex flex-col lg:flex-row items-center justify-center gap-10">
          <div v-for="(schedule, i) in store.currentSchedules" :key="schedule.settings.leagueMatchEvent.id" class="max-w-xl">
              <ChallengeScheduleBox
                :currentSchedule="schedule"
                type="challenge"
                class="w-full"
                :class="(i % 2) ? 'md:rotate-1' : 'md:-rotate-1'"
                />
            </div>
        </div>

        <!-- No events -->
        <ProductContainer v-else :bg="type.bg" class="w-full mx-auto max-w-lg pt-10 pb-4 -rotate-1">
          <div class="flex justify-center">
            <div class="inline-flex items-center font-splatoon2 text-xl text-shadow m-2">
              <img :src="type.img" />
              {{ $t('events.not_available') }}
            </div>
          </div>
        </ProductContainer>
      </div>
    </div>
  </MainLayout>
</template>
<script setup>
import { computed } from 'vue';

import MainLayout from '@/layouts/MainLayout.vue'
import ProductContainer from '../components/ProductContainer.vue';
import ChallengeScheduleBox from '@/components/challenge/ChallengeScheduleBox.vue'

import { useScheduleTypes } from '@/components/concerns/scheduleTypes.mjs';
import { useEventSchedulesStore } from '@/stores/schedules.mjs'

const store = useEventSchedulesStore();
const { types } = useScheduleTypes();

const type = computed(() => types['challenge']);
</script>
