<template>
  <ProductContainer bg="bg-gray-600 pt-10">
    <div class="space-y-2">
      <div class="flex items-center justify-center space-x-1 mx-2">
        <div class="font-splatoon1 text-4xl">
          {{ type.name }}
        </div>
      </div>

      <div class="pt-2 pb-6 px-2 space-y-2" v-if="store.activeSchedule">
        <div class="flex items-center justify-between font-splatoon2">
          <div class="flex items-center space-x-2 text-2xl">
            <div>
              <RuleIcon :rule="store.activeSchedule.settings.vsRule" class="h-10" />
            </div>
            <div>{{ store.activeSchedule.settings.vsRule.name }}</div>
          </div>

          <div>
            <div class="flex items-center" v-if="type.badge">
              <img :src="type.img" class="h-10" />
              <div v-if="type.badge" class="font-splatoon2 text-2xl bg-splatoon-blue px-2 drop-shadow">
                {{ type.badge }}
              </div>
            </div>
          </div>

        </div>

        <div class="space-y-8">
          <StageImage
            class="flex-1"
            imgClass="rounded-2xl"
            :stage="store.activeSchedule.settings.vsStages[0]"
            />
          <StageImage
            class="flex-1"
            imgClass="rounded-2xl"
            :stage="store.activeSchedule.settings.vsStages[1]"
            />
        </div>
      </div>
    </div>
  </ProductContainer>
</template>

<script setup>
import { computed } from '@vue/reactivity';
import { useAnarchyOpenSchedulesStore, useAnarchySeriesSchedulesStore, useRegularSchedulesStore } from '@/stores/schedules';
import ProductContainer from '../ProductContainer.vue';
import StageImage from '../StageImage.vue';

import battleRegularSvg from '@/assets/img/modes/regular.svg';
import battleBankaraSvg from '@/assets/img/modes/bankara.svg';
import RuleIcon from '../RuleIcon.vue';

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
</script>
