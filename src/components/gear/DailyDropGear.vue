<template>
  <ProductContainer class="pt-10 pb-4" bg="bg-splatoon-blue bg-circles">
    <div class="space-y-4">
      <div>
        <div v-if="brand" class="-mb-10">
          <img :src="brand.image.url" />
        </div>
        <div class="flex flex-col items-center -space-y-2">
          <SquidTape class="font-splatoon2 text-sm text-black rounded-sm -rotate-2 z-10" bg="bg-splatoon-green" squidBg="bg-black"
            border="border border-black">
            <div class="px-1">
              {{ $t('gear.dailydrop') }}
            </div>
          </SquidTape>

          <div class="relative -rotate-2" v-if="brand">
            <img src="@/assets/img/gesotown-daily-drop-bg.png" class="w-64" />
            <div class="absolute inset-0 flex items-center ml-4">
              <div class="font-splatoon2 text-lg">
                {{ $t(`splatnet.brands.${brand.brand.id}.name`, brand.brand.name) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <template v-if="brand">
        <div class="text-center font-splatoon2 text-splatoon-yellow">
          {{ $t('time.until', { time: $d(brand?.saleEndTime, 'dateTimeShortWeekday') }) }}
        </div>
        <div class="space-y-4 px-4">
          <GearCardHorizontal
            class="bg-zinc-100 bg-opacity-20 backdrop-blur-sm border border-zinc-50 border-opacity-20 rounded-lg"
            v-for="gear in gears"
            :key="gear.id"
            :gear="gear"
            />
        </div>
      </template>

      <template v-else>
        <div class="h-24 flex items-center justify-center">
          <div class="font-splatoon2 text-splatoon-yellow">
            {{ $t('times.checkback') }}
          </div>
        </div>
      </template>
    </div>
  </ProductContainer>
</template>

<script setup>
import { useGearStore } from '@/stores/gear.mjs';
import { computed } from 'vue';
import GearCardHorizontal from './GearCardHorizontal.vue';
import ProductContainer from '../ProductContainer.vue';
import SquidTape from '../SquidTape.vue';

const gearStore = useGearStore();
const brand = computed(() => gearStore.dailyDropBrand);
const gears = computed(() => gearStore.dailyDropGear);
</script>

<style scoped>
:deep(.bg-circles) {
  background-image: url('@/assets/img/circles-transparent.png'),
    linear-gradient(180deg, rgba(2, 0, 36, 0.10) 0%, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.25) 100%);
  background-size: contain;
}
</style>
