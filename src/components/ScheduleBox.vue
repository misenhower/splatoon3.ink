<template>
  <ProductContainer bg="bg-gray-600 pt-10 pb-8" class="w-full">
    <div class="space-y-2">
      <div class="flex items-center space-x-2 mx-2">
        <img :src="type.img" />
        <div class="font-splatoon1 lg:text-2xl xl:text-3xl">
          {{ type.name }}
        </div>
        <div v-if="type.badge" class="font-splatoon2 text-xs lg:text-sm xl:text-base bg-splatoon-blue px-1 drop-shadow">
          {{ type.badge }}
        </div>
      </div>

      <div class="bg-active bg-cover pt-2 pb-6 px-4 space-y-2">
        <div class="flex items-center justify-between font-splatoon2">
          <div class="flex items-center space-x-2 text-sm lg:text-lg">
            <template v-if="store.activeSchedule">
              <div>
                <RuleIcon :rule="store.activeSchedule.settings.vsRule" class="h-5 lg:h-6" />
              </div>
              <div>{{ store.activeSchedule.settings.vsRule.name }}</div>
            </template>

            <template v-else>
              <div class="w-32 bg-gray-600 rounded animate-pulse">&nbsp;</div>
            </template>
          </div>

          <div class="justify-end text-xs lg:text-sm bg-splatoon-green text-black px-2" v-if="store.activeSchedule">
            {{ formatTime(store.activeSchedule.startTime) }}
            &ndash;
            {{ formatTime(store.activeSchedule.endTime) }}
          </div>
        </div>

        <div class="flex space-x-1">
          <StageImage
            class="flex-1"
            imgClass="rounded-l-xl"
            :stage="store.activeSchedule?.settings.vsStages[0]"
            />
          <StageImage
            class="flex-1"
            imgClass="rounded-r-xl"
            :stage="store.activeSchedule?.settings.vsStages[1]"
            />
        </div>
      </div>

      <div class="mx-2 space-y-2">
        <div class="font-splatoon1 bg-splatoon-blue inline-block px-2 rounded-lg drop-shadow">
          Next
        </div>

        <ScheduleRow :schedule="nextSchedule" />
      </div>
    </div>
  </ProductContainer>
</template>

<script setup>
import { computed } from '@vue/reactivity';
import { useAnarchyOpenSchedulesStore, useAnarchySeriesSchedulesStore, useRegularSchedulesStore } from '../stores/schedules';
import ProductContainer from './ProductContainer.vue';
import StageImage from './StageImage.vue';
import ScheduleRow from './ScheduleRow.vue';

import battleRegularSvg from '@/assets/img/modes/regular.svg';
import battleBankaraSvg from '@/assets/img/modes/bankara.svg';
import RuleIcon from './RuleIcon.vue';
import { formatTime } from '../common/time';

const props = defineProps({
  type: {
    type: String,
    required: true,
  },
});

const types = {
  regular: {
    name: 'Regular Battle',
    badge: null,
    store: useRegularSchedulesStore(),
    img: battleRegularSvg,
  },
  anarchySeries: {
    name: 'Anarchy Battle',
    badge: 'Series',
    store: useAnarchySeriesSchedulesStore(),
    img: battleBankaraSvg,
  },
  anarchyOpen: {
    name: 'Anarchy Battle',
    badge: 'Open',
    store: useAnarchyOpenSchedulesStore(),
    img: battleBankaraSvg,
  },
};

const type = computed(() => types[props.type]);
const store = computed(() => type.value.store);
const nextSchedule = computed(() => store.value.upcomingSchedules?.at(0));
</script>

<style scoped>
.bg-active {
  background-image: url('@/assets/img/dark-bg.jpg')
}
</style>
