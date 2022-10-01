<template>
  <ProductContainer bg="bg-splatoon-salmonRun bg-monsters" class="pt-8 overflow-hidden rounded-2xl">
    <div class="space-y-2">
      <div class="font-splatoon1 text-3xl mx-4 text-shadow">
        Salmon Run
      </div>

      <div class="flex">
        <!-- Character graphic -->
        <div class="flex-1 bg-character hidden md:block"></div>

        <!-- Main content -->
        <div class="md:w-2/3 mx-2 pb-2">
          <div class="mb-6 space-y-2" v-if="store.activeSchedule">
            <SquidTape class="font-splatoon2 text-sm drop-shadow -rotate-6 -mx-2">
              <div class="px-2">Now Open!</div>
            </SquidTape>

            <ExpandedSalmonRunRow :schedule="store.activeSchedule" />
          </div>

          <div class="ss:hidden py-1 bg-zinc-900 bg-opacity-70 rounded-lg backdrop-blur-sm">
            <SquidTape class="font-splatoon2 text-sm drop-shadow -rotate-6 -mx-2">
              <div class="px-2">Soon!</div>
            </SquidTape>

            <div class="mx-2 divide-y-2 divide-dashed divide-zinc-400">
              <div v-for="schedule in store.upcomingSchedules" :key="schedule.startTime">
                <SalmonRunRow class="my-2" :schedule="schedule"/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ProductContainer>
</template>

<script setup>
import { useSalmonRunSchedulesStore } from '@/stores/schedules.mjs';
import ProductContainer from '../ProductContainer.vue';
import SquidTape from '../SquidTape.vue';
import SalmonRunRow from './SalmonRunRow.vue';
import ExpandedSalmonRunRow from './ExpandedSalmonRunRow.vue';

const store = useSalmonRunSchedulesStore();
</script>

<style scoped>
.bg-character {
  background-image: url('@/assets/img/salmon-character.png'), url('@/assets/img/salmon-character-bg.png');
  background-size: cover;
  background-position: top, center;
  background-repeat: no-repeat;
}

:deep(.bg-monsters) {
  background-image: url('@/assets/img/monsters-transparent-bg.png'),
    linear-gradient(180deg, rgba(2, 0, 36, 0.10) 0%, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.2) 100%);
  background-size: 400px;
  background-position: top center;
}
</style>
