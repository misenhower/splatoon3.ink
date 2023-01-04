<template>
  <ProductContainer :bg="type.bg" class="pt-10">
    <div class="space-y-2">
      <div class="flex items-center justify-center space-x-1 mx-2">
        <div class="font-splatoon1 text-2xl text-shadow">
          {{ $t(type.name) }}
        </div>
      </div>

      <div class="pt-2 pb-6 px-2 space-y-2" v-if="store.activeSchedule">
        <div class="flex items-center justify-between font-splatoon2">
          <div class="flex items-center space-x-2 text-xl">
            <div>
              <RuleIcon :rule="store.activeSchedule.settings.vsRule" class="h-8" />
            </div>
            <div class="text-shadow">{{ store.activeSchedule.settings.vsRule.name }}</div>
          </div>

          <div>
            <div class="flex items-center" v-if="type.badge">
              <img :src="type.img" class="h-8" />
              <div v-if="type.badge" class="font-splatoon2 text-xl bg-splatoon-blue px-2 drop-shadow rounded">
                {{ $t(type.badge) }}
              </div>
            </div>
          </div>

        </div>

        <div class="space-y-8">
          <StageImage
            class="flex-1"
            imgClass="rounded-2xl"
            :stage="store.activeSchedule.settings.vsStages[0]"
            textSize="text-xl"
            />
          <StageImage
            class="flex-1"
            imgClass="rounded-2xl"
            :stage="store.activeSchedule.settings.vsStages[1]"
            textSize="text-xl"
            />

          <div class="flex-1 relative" v-if="tricolor?.isTricolorActive">
            <StageImage
              imgClass="rounded-2xl"
              :stage="tricolor?.tricolorStage"
              textSize="text-xl"
              />

            <div class="absolute top-0 right-0 rounded-full bg-black p-1">
              <TricolorIcon
                class="h-12 w-12"
                :a="tricolor?.teams[0]?.color"
                :b="tricolor?.teams[1]?.color"
                :c="tricolor?.teams[2]?.color"
                />
            </div>
          </div>
        </div>
      </div>
    </div>
  </ProductContainer>
</template>

<script setup>
import { computed } from 'vue';
import { useUSSplatfestsStore } from '@/stores/splatfests';
import ProductContainer from '../ProductContainer.vue';
import StageImage from '../StageImage.vue';
import RuleIcon from '../RuleIcon.vue';
import TricolorIcon from '../TricolorIcon.vue';
import { useScheduleTypes } from '@/components/concerns/scheduleTypes.mjs';

const props = defineProps({
  type: {
    type: String,
    required: true,
  },
});

const { types } = useScheduleTypes();

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
