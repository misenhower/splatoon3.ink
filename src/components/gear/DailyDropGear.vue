<template>
  <ProductContainer class="pt-10 pb-4" bg="bg-splatoon-blue bg-circles">
    <div class="space-y-4">
      <div>
        <div v-if="loading || brand" class="-mb-10">
          <SkeletonBlock v-if="loading" class="aspect-2/1" />
          <img v-else :src="brand.image.url" width="1600" height="800" />
        </div>
        <div class="flex flex-col items-center -space-y-2">
          <SquidTape
            class="font-splatoon2 text-sm text-black rounded-xs -rotate-2 z-10"
            bg="bg-splatoon-green"
            squid-bg="bg-black"
            border="border border-black"
          >
            <div class="px-1">
              {{ $t('gear.dailydrop') }}
            </div>
          </SquidTape>

          <div v-if="loading || brand" class="relative -rotate-2">
            <img width="840" height="146" src="@/assets/img/gesotown-daily-drop-bg.png" class="w-64" />
            <div class="absolute inset-0 flex items-center ml-4">
              <SkeletonBlock v-if="loading" class="h-7 w-32" />
              <div v-else class="font-splatoon2 text-lg">
                {{ $t(`splatnet.brands.${brand.brand.id}.name`, brand.brand.name) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <template v-if="loading || brand">
        <div class="text-center font-splatoon2 text-splatoon-yellow">
          <SkeletonBlock v-if="loading" class="h-6 w-52 mx-auto" />
          <template v-else>
            {{ $t('time.until', { time: $d(brand?.saleEndTime, 'dateTimeShortWeekday') }) }}
          </template>
        </div>
        <div class="space-y-4 px-4">
          <GearCardHorizontal
            v-for="(gear, i) in loading ? [null, null, null] : gears"
            :key="gear?.id ?? i"
            class="bg-zinc-100/20 backdrop-blur-xs border border-zinc-50/20 rounded-lg"
            :gear="gear"
            :loading="loading"
          />
        </div>
      </template>

      <template v-else>
        <div class="h-24 flex items-center justify-center">
          <div class="font-splatoon2">
            {{ $t('times.checkback') }}
          </div>
        </div>
      </template>
    </div>
  </ProductContainer>
</template>

<script setup>
import { computed } from 'vue';
import SkeletonBlock from '@/components/loading/SkeletonBlock.vue';
import GearCardHorizontal from './GearCardHorizontal.vue';
import ProductContainer from '@/components/ProductContainer.vue';
import SquidTape from '@/components/SquidTape.vue';
import { useGearStore } from '@/stores/gear.mjs';

defineProps({ loading: Boolean });

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
