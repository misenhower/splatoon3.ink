<template>
  <ProductContainer :bg="type.bg" class="pt-10 max-w-sm">
    <div class="space-y-2">
      <div class="flex items-center justify-center space-x-1 mx-2">
        <div class="font-splatoon1 text-2xl text-shadow">
          {{ $t(type.name) }}
        </div>
      </div>

      <div class="pt-2 pb-6 px-2 space-y-2">
        <div class="flex items-center justify-between font-splatoon2">
          <div class="flex items-center space-x-2 text-xl">
            <div>
              <TricolorIcon
                class="h-8 drop-shadow-ruleIcon"
                :a="tricolor?.teams[0]?.color"
                :b="tricolor?.teams[1]?.color"
                :c="tricolor?.teams[2]?.color"
              />
            </div>
            <div class="text-shadow">
              Tricolor Turf War
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
            img-class="rounded-2xl"
            :stage="tricolor?.tricolorStage"
            text-size="text-xl"
          />
        </div>
      </div>
    </div>
  </ProductContainer>
</template>

<script setup>
import { computed } from 'vue';
import ProductContainer from '../ProductContainer.vue';
import StageImage from '../StageImage.vue';
import TricolorIcon from '../TricolorIcon.vue';
import { useUSSplatfestsStore } from '@/stores/splatfests';
import { useScheduleTypes } from '@/components/concerns/scheduleTypes.mjs';


const { types } = useScheduleTypes();

const type = computed(() => types["splatfestTricolor"]);
const tricolor = computed(() => useUSSplatfestsStore().tricolor);
</script>

<style scoped>
:deep(.bg-tapes) {
  background-image: url('@/assets/img/tapes-transparent.png'),
    linear-gradient(180deg, rgba(2, 0, 36, 0.10) 0%, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.25) 100%);
  background-size: contain;
}
</style>
