<template>
  <ProductContainer :bg="eggstra ? 'bg-splatoon-eggstraWork bg-monsters' : 'bg-splatoon-salmonRun bg-monsters'" class="pt-8 overflow-hidden rounded-2xl">
    <div class="space-y-2">
      <div v-if="eggstra" class="font-splatoon1 text-3xl mx-4 text-shadow">
        {{ $t('salmonrun.eggstrawork') }}
      </div>
      <div v-else class="font-splatoon1 text-3xl mx-4 text-shadow">
        {{ $t('salmonrun.title') }}
      </div>

      <div class="flex">
        <!-- Character graphic -->
        <div v-if="eggstra" class="flex-1 bg-eggstra hidden md:block" />
        <div v-else class="flex-1 bg-character hidden md:block" />

        <!-- Main content -->
        <div class="md:w-2/3 mx-2 pb-2">
          <div v-if="activeSchedule" class="mb-6 space-y-2">
            <SquidTape class="font-splatoon2 text-sm drop-shadow -rotate-6 -mx-2">
              <div class="px-2">
                {{ $t('times.now') }}
              </div>
            </SquidTape>

            <ExpandedSalmonRunRow :schedule="activeSchedule" :eggstra="eggstra" />
          </div>

          <div v-if="upcomingSchedules.length" class="py-1 bg-zinc-900 bg-opacity-70 rounded-lg backdrop-blur-sm">
            <SquidTape class="font-splatoon2 text-sm drop-shadow -rotate-6 -mx-2">
              <div class="px-2">
                {{ $t('times.future') }}
              </div>
            </SquidTape>

            <div class="mx-2 divide-y-2 divide-dashed divide-zinc-400">
              <div v-for="schedule in upcomingSchedules" :key="schedule.startTime">
                <ExpandedSalmonRunRow v-if="isScreenshot || eggstra" class="my-3" :schedule="schedule" :eggstra="eggstra" />
                <SalmonRunRow v-else class="my-2" :schedule="schedule" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ProductContainer>
</template>

<script setup>
import { computed } from 'vue';
import SalmonRunRow from './SalmonRunRow.vue';
import ExpandedSalmonRunRow from './ExpandedSalmonRunRow.vue';
import ProductContainer from '@/components/ProductContainer.vue';
import SquidTape from '@/components/SquidTape.vue';
import { useSalmonRunSchedulesStore, useEggstraWorkSchedulesStore } from '@/stores/schedules.mjs';

const props = defineProps({
  isScreenshot: Boolean,
  startTime: String,
  eggstra: Boolean,
});

const store = computed(() => props.eggstra ? useEggstraWorkSchedulesStore() : useSalmonRunSchedulesStore());

function filterSchedules(schedules) {
  return schedules.filter(s => !props.startTime || s?.startTime === props.startTime);
}
const activeSchedule = computed(() => filterSchedules([store.value.activeSchedule])[0]);
const upcomingSchedules = computed(() => {
  if (props.isScreenshot && !props.startTime) {
    return [];
  }

  return filterSchedules(store.value.upcomingSchedules);
});
</script>

<style scoped>
.bg-character {
  background-image: url('@/assets/img/salmon-character.png'), url('@/assets/img/salmon-character-bg.png');
  background-size: cover;
  background-position: top, center;
  background-repeat: no-repeat;
}

.bg-eggstra {
  background-image: url('@/assets/img/eggstra-work.png');
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
