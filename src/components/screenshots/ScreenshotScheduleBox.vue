<template>
  <ProductContainer :bg="type.bg" class="pt-10 max-w-sm">
    <div class="space-y-2">
      <div class="flex items-center justify-center space-x-1 mx-2">
        <div class="font-splatoon1 text-2xl text-shadow">
          {{ $t(type.name) }}
        </div>
      </div>

      <div v-if="store.activeSchedule" class="pt-2 pb-6 px-2 space-y-2">
        <div class="flex items-center justify-between font-splatoon2">
          <div class="flex items-center space-x-2 text-xl">
            <div>
              <RuleIcon :rule="store.activeSchedule.settings.vsRule" class="h-8 drop-shadow-ruleIcon" />
            </div>
            <div class="text-shadow">
              {{ store.activeSchedule.settings.vsRule.name }}
            </div>
          </div>

          <div>
            <div v-if="type.badge" class="flex items-center">
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
            img-class="rounded-2xl"
            :stage="store.activeSchedule.settings.vsStages[0]"
            text-size="text-xl"
          />
          <StageImage
            class="flex-1"
            img-class="rounded-2xl"
            :stage="store.activeSchedule.settings.vsStages[1]"
            text-size="text-xl"
          />
        </div>
      </div>
    </div>
  </ProductContainer>
</template>

<script setup>
import { computed } from 'vue';
import ProductContainer from '@/components/ProductContainer.vue';
import StageImage from '@/components/StageImage.vue';
import RuleIcon from '@/components/RuleIcon.vue';
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
</script>

<style scoped>
:deep(.bg-tapes) {
  background-image: url('@/assets/img/tapes-transparent.png'),
    linear-gradient(180deg, rgba(2, 0, 36, 0.10) 0%, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.25) 100%);
  background-size: contain;
}
</style>
