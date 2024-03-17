<template>
  <ProductContainer :bg="type.bg" class="w-full pt-10 pb-4">
    <div class="space-y-2">
      <div class="flex items-center space-x-2 mx-2">
        <img :src="type.img" />
        <div class="font-splatoon1 lg:text-2xl xl:text-3xl text-shadow">
          {{ $t(type.name) }}
        </div>
        <div v-if="type.badge" class="font-splatoon2 text-xs lg:text-sm xl:text-base bg-splatoon-blue rounded px-1 drop-shadow">
          {{ $t(type.badge) }}
        </div>
      </div>

      <div class="bg-zinc-900 bg-opacity-70 backdrop-blur-sm pt-2 pb-6 px-2 mx-1 rounded-lg space-y-2">
        <div class="flex items-center justify-between font-splatoon2">
          <div class="flex items-center space-x-2 text-sm lg:text-lg">
            <div>
              <TricolorIcon
                class="h-6 w-6"
                :a="tricolor?.teams[0]?.color"
                :b="tricolor?.teams[1]?.color"
                :c="tricolor?.teams[2]?.color"
              />
            </div>
            <div class="text-shadow">
              {{ $t("splatnet.rules.TRI_COLOR.name", "Tricolor Turf War") }}
            </div>
          </div>

          <div v-if="tricolor.startTime && tricolor.endTime" class="justify-end text-xs lg:text-sm bg-zinc-100 bg-opacity-80 rounded text-black px-2">
            {{ $d(tricolor.startTime, 'dateTimeShort') }}
            &ndash;
            {{ $d(tricolor.endTime, 'dateTimeShort') }}
          </div>
        </div>

        <div class="flex space-x-1">
          <div class="flex-1 relative">
            <StageImage
              img-class="rounded-xl"
              :stage="tricolor?.tricolorStage"
            />
          </div>
        </div>
      </div>
    </div>
  </ProductContainer>
</template>

<script setup>
import { computed } from 'vue';
import ProductContainer from './ProductContainer.vue';
import StageImage from './StageImage.vue';
import { useScheduleTypes } from './concerns/scheduleTypes.mjs';
import TricolorIcon from './TricolorIcon.vue';
import { useUSSplatfestsStore } from '@/stores/splatfests';


const { types } = useScheduleTypes();

const type = computed(() => types['splatfestTricolor']);
const tricolor = computed(() => useUSSplatfestsStore().tricolor);


</script>

<style scoped>
:deep(.bg-tapes) {
  background-image: url('@/assets/img/tapes-transparent.png'),
    linear-gradient(180deg, rgba(2, 0, 36, 0.10) 0%, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.25) 100%);
  background-size: contain;
}
</style>
