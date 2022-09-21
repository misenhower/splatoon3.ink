<template>
  <ProductContainer class="pt-6 pb-4" bg="bg-splatoon-blue bg-circles">
    <div class="space-y-4">
      <div>
        <div class="flex flex-col items-center -mt-10 -space-y-2">
          <SquidTape class="font-splatoon2 text-2xl text-black rounded-sm -rotate-2 z-10" bg="bg-splatoon-green"
            squidBg="bg-black" border="border-2 border-black" squidSize="20px">
            <div class="px-3 py-1">
              The Daily Drop
            </div>
          </SquidTape>

          <div class="relative -rotate-2">
            <img src="@/assets/img/gesotown-daily-drop-bg.png" class="w-80" />
            <div class="absolute inset-0 flex items-center ml-4">
              <div class="font-splatoon2 text-2xl">
                {{ brand?.brand.name }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex mx-4">
        <GearCard v-for="gear in gears" :key="gear.id" :gear="gear" />
      </div>
    </div>
  </ProductContainer>
</template>

<script setup>
import { useGearStore } from '@/stores/gear.mjs';
import { computed } from '@vue/reactivity';
import { formatDateTime } from '@/common/time';
import GearCard from '@/components/gear/GearCard.vue';
import ProductContainer from '@/components/ProductContainer.vue';
import SquidTape from '@/components/SquidTape.vue';

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
