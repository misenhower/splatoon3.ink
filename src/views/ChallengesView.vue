<template>
    <MainLayout :title="$t('events.title')">
      <div class="grow flex items-center justify-center">
        <div class="mx-4 md:mx-12 w-full space-y-10 max-w-xl">
          <template v-if="store.activeSchedule || store.upcomingSchedules && store.upcomingSchedules.length > 0">
            <div v-for="schedule in store.activeSchedule">
              <ChallengeScheduleBox :currentSchedule="schedule" type="challenge" class="flex-1 md:-rotate-1" />
            </div>

            <div v-for="schedule in store.upcomingSchedules">
              <ChallengeScheduleBox :currentSchedule="schedule" type="challenge" class="flex-1 md:-rotate-1" />
            </div>
          </template>

          <template v-else>
            <ProductContainer :bg="type.bg" class="w-full pt-10 pb-4 -rotate-1">
              <div class="flex justify-center">
                <div class="inline-flex items-center font-splatoon2 text-xl text-shadow m-2">
                  <img :src="type.img" />
                  {{ $t('events.not_available') }}
                </div>
              </div>
            </ProductContainer>
          </template>
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
  