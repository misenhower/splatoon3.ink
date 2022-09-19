<template>
  <ProductContainer class="pt-10 pb-4" bg="bg-splatoon-blue bg-circles">
    <div class="space-y-4">
      <div>
        <div>
          <img :src="brand.image.url" v-if="brand" />
        </div>
        <div class="flex flex-col items-center -mt-10 -space-y-2">
          <SquidTape class="font-splatoon2 text-sm text-black rounded-sm -rotate-2 z-10" bg="bg-splatoon-green" squidBg="bg-black"
            border="border border-black">
            <div class="px-1">
              The Daily Drop
            </div>
          </SquidTape>

          <div class="relative -rotate-2">
            <img src="@/assets/img/gesotown-daily-drop-bg.png" class="w-64" />
            <div class="absolute inset-0 flex items-center ml-4">
              <div class="font-splatoon2 text-lg">
                {{ brand?.brand.name }}
              </div>
            </div>
          </div>

          <div class="bg-daily-drop">
          </div>
        </div>
      </div>

      <div class="text-center font-splatoon2 text-splatoon-yellow">
        Until {{ formatDateTime(brand?.saleEndTime) }}
      </div>
      <div class="space-y-4 px-4">
        <GearCardHorizontal
          class="bg-gray-100 bg-opacity-20 backdrop-blur-sm border border-gray-50 border-opacity-20 rounded-lg"
          v-for="gear in gears"
          :key="gear.id"
          :gear="gear"
          />
      </div>
    </div>
  </ProductContainer>
</template>

<script setup>
import { useGearStore } from '@/stores/gear.mjs';
import { computed } from '@vue/reactivity';
import { formatDateTime } from '@/common/time';
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

.bg-daily-drop {
  background-image: url('@/assets/img/gesotown-daily-drop-bg.png');
  background-repeat: no-repeat;
  background-size: 420px 73px;
  background-position: center;
}
</style>
