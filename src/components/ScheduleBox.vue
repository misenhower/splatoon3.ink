<template>
  <ProductContainer :bg="type.bg" class="w-full bg-tapes pt-10 pb-8">
    <div class="space-y-2">
      <div class="flex items-center space-x-2 mx-2">
        <img :src="type.img" />
        <div class="font-splatoon1 lg:text-2xl xl:text-3xl text-shadow">
          {{ type.name }}
        </div>
        <div v-if="type.badge" class="font-splatoon2 text-xs lg:text-sm xl:text-base bg-splatoon-blue rounded px-1 drop-shadow">
          {{ type.badge }}
        </div>
      </div>

      <div class="bg-gray-900 bg-opacity-70 backdrop-blur-sm pt-2 pb-6 px-2 mx-1 rounded-lg space-y-2">
        <div class="flex items-center justify-between font-splatoon2">
          <div class="flex items-center space-x-2 text-sm lg:text-lg">
            <template v-if="store.activeSchedule">
              <div>
                <RuleIcon :rule="store.activeSchedule.settings.vsRule" class="h-5 lg:h-6" />
              </div>
              <div class="text-shadow">{{ store.activeSchedule.settings.vsRule.name }}</div>
            </template>

            <template v-else>
              <div class="w-32 bg-gray-600 rounded animate-pulse">&nbsp;</div>
            </template>
          </div>

          <div class="justify-end text-xs lg:text-sm bg-gray-100 bg-opacity-80 rounded text-black px-2" v-if="store.activeSchedule">
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
    bg: 'bg-splatoon-battle-regular',
  },
  anarchySeries: {
    name: 'Anarchy Battle',
    badge: 'Series',
    store: useAnarchySeriesSchedulesStore(),
    img: battleBankaraSvg,
    bg: 'bg-splatoon-battle-ranked',
  },
  anarchyOpen: {
    name: 'Anarchy Battle',
    badge: 'Open',
    store: useAnarchyOpenSchedulesStore(),
    img: battleBankaraSvg,
    bg: 'bg-splatoon-battle-ranked',
  },
};

const type = computed(() => types[props.type]);
const store = computed(() => type.value.store);
const nextSchedule = computed(() => store.value.upcomingSchedules?.at(0));
</script>

<style scoped>
.bg-tapes {
  background-image: url('@/assets/img/tapes-transparent.png'),
    linear-gradient(180deg, rgba(2, 0, 36, 0.10) 0%, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.25) 100%);
  background-size: contain;
}
</style>
