<template>
  <ProductContainer :bg="type.bg" class="pt-10">
    <div class="space-y-2">
      <div class="flex items-center justify-center space-x-1 mx-2">
        <div class="font-splatoon1 text-4xl text-shadow">
          {{ type.name }}
        </div>
      </div>

      <div class="pt-2 pb-6 px-2 space-y-2" v-if="store.activeSchedule">
        <div class="flex items-center justify-between font-splatoon2">
          <div class="flex items-center space-x-2 text-2xl">
            <div>
              <RuleIcon :rule="store.activeSchedule.settings.vsRule" class="h-10" />
            </div>
            <div class="text-shadow">{{ store.activeSchedule.settings.vsRule.name }}</div>
          </div>

          <div>
            <div class="flex items-center" v-if="type.badge">
              <img :src="type.img" class="h-10" />
              <div v-if="type.badge" class="font-splatoon2 text-2xl bg-splatoon-blue px-2 drop-shadow rounded">
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
            textSize="text-3xl"
            />
          <StageImage
            class="flex-1"
            imgClass="rounded-2xl"
            :stage="store.activeSchedule.settings.vsStages[1]"
            textSize="text-3xl"
            />

          <div class="flex-1 relative" v-if="tricolor?.isTricolorActive">
            <StageImage imgClass="rounded-2xl" :stage="tricolor?.tricolorStage" />

            <div class="absolute top-0 right-0 rounded-full bg-black p-1">
              <img src="@/assets/img/rules/tricolor.svg" class="h-12 w-12" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </ProductContainer>
</template>

<script setup>
import { computed } from '@vue/reactivity';
import { useAnarchyOpenSchedulesStore, useAnarchySeriesSchedulesStore, useRegularSchedulesStore, useSplatfestSchedulesStore } from '@/stores/schedules';
import { useUSSplatfestsStore } from '@/stores/splatfests';
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
    bg: 'bg-splatoon-battle-regular bg-tapes',
  },
  anarchySeries: {
    name: 'Anarchy Battle',
    badge: 'Series',
    store: useAnarchySeriesSchedulesStore(),
    img: battleBankaraSvg,
    bg: 'bg-splatoon-battle-ranked bg-tapes',
  },
  anarchyOpen: {
    name: 'Anarchy Battle',
    badge: 'Open',
    store: useAnarchyOpenSchedulesStore(),
    img: battleBankaraSvg,
    bg: 'bg-splatoon-battle-ranked bg-tapes',
  },
  splatfest: {
    name: 'Splatfest Battle',
    badge: null,
    store: useSplatfestSchedulesStore(),
    img: battleRegularSvg,
    bg: 'bg-splatoon-battle-regular bg-tapes',
  },
};

const type = computed(() => types[props.type]);
const store = computed(() => type.value.store);
const tricolor = computed(() => useUSSplatfestsStore().tricolor);
</script>

<style scoped>
:deep(.bg-tapes) {
  background-image: url('@/assets/img/tapes-transparent.png'),
    linear-gradient(180deg, rgba(2, 0, 36, 0.10) 0%, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.25) 100%);
  background-size: contain;
}
</style>
