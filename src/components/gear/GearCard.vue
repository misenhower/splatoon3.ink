<template>
  <div class="relative">
    <img width="952" height="972" src="@/assets/img/gesotown-tape-blob-bg.png" />

    <div class="absolute inset-0 flex flex-col items-center justify-evenly my-4">
      <template v-if="loading">
        <SkeletonBlock class="h-20 w-20 lg:h-24 lg:w-24 xl:h-28 xl:w-28" />
        <SkeletonBlock class="h-8 w-24" />
        <SkeletonBlock class="h-5 w-3/4" />
        <SkeletonBlock class="h-6 w-16" />
      </template>
      <template v-else>
        <!-- Gear Image -->
        <div>
          <img :src="gear.image.url" class="h-20 w-20 lg:h-24 lg:w-24 xl:h-28 xl:w-28" />
        </div>

        <!-- Powers -->
        <div>
          <div class="flex items-center space-x-px">
            <div :title="$t(`splatnet.powers.${gear.primaryGearPower.__splatoon3ink_id}.name`, gear.primaryGearPower.name)" class="bg-black rounded-full">
              <img :src="gear.primaryGearPower.image.url" class="h-8 w-8" />
            </div>

            <div v-for="(power, i) in gear.additionalGearPowers" :key="i" :title="$t(`splatnet.powers.${power.__splatoon3ink_id}.name`, power.name)" class="bg-black rounded-full">
              <img :src="power.image.url" class="h-6 w-6" />
            </div>
          </div>
        </div>

        <!-- Name -->
        <div class="relative text-center">
          <div class="mx-6">
            <img width="246" height="38" src="@/assets/img/gesotown-tape.svg" />
          </div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="font-splatoon2 text-sm xl:text-base ss:text-lg text-shadow">
              {{ $t(`splatnet.gear.${gear.__splatoon3ink_id}.name`, gear.name) }}
            </div>
          </div>
        </div>

        <!-- Price -->
        <div class="flex items-center space-x-2">
          <div>
            <img width="19" height="17" src="@/assets/img/gesotown-coin.svg" />
          </div>
          <div class="font-splatoon1">
            {{ price }}
          </div>
        </div>
      </template>
    </div>

    <!-- Brand -->
    <div class="absolute top-0 right-10">
      <div class="relative rotate-2">
        <img width="82" height="71" src="@/assets/img/gesotown-brand-bg.png" class="w-10" />
        <div class="absolute inset-0 p-2">
          <SkeletonBlock v-if="loading" class="w-full h-full" />
          <img v-else :src="gear.brand.image.url" class="w-full h-full" :title="$t(`splatnet.brands.${gear.brand.id}.name`, gear.brand.name)" />
        </div>
      </div>
    </div>

    <!-- Time left -->
    <div class="absolute top-1 left-6">
      <div class="inline-block text-xs bg-zinc-200/30 rounded-sm px-1 py-px font-semibold">
        <SkeletonBlock v-if="loading" class="h-4 w-16" />
        <template v-else>
          {{ $t('time.left', { time: formatDurationHoursFromNow(props.gear.saleEndTime) }) }}
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import SkeletonBlock from '@/components/loading/SkeletonBlock.vue';
import { computed } from 'vue';
import { formatDurationHoursFromNow } from '@/common/time';

const props = defineProps({
  gear: Object,
  loading: Boolean,
});

const price = computed(() => props.gear.price);
const gear = computed(() => props.gear.gear);
</script>

<style scoped>
.bg-price {
  background-image: url('@/assets/img/gesotown-price-bg.png');
  background-repeat: no-repeat;
  background-size: 120px 31px;
  background-position: left;
}
</style>
