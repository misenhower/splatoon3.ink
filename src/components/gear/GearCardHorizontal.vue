<template>
  <div class="flex items-center space-x-4 py-2 relative">
    <!-- Gear Image -->
    <div class="ml-2 shrink-0">
      <img :src="gear.image.url" class="h-20 w-20" />
    </div>

    <!-- Details -->
    <div class="grow min-w-0 flex flex-col justify-evenly space-y-2">
      <div class="flex">
        <div class="inline-block text-xs bg-zinc-200 bg-opacity-30 rounded px-1 py-px font-semibold">
          {{ $t('time.left', { time: formatShortDurationFromNow(props.gear.saleEndTime) }) }}
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <div class="bg-white h-6 aspect-square rounded">
          <img :src="gear.brand.image.url" :title="$t(`splatnet.brands.${gear.brand.id}.name`, gear.brand.name)" />
        </div>

        <div class="flex-1 font-splatoon2 text-shadow overflow-hidden overflow-ellipsis whitespace-nowrap">
          {{ $t(`splatnet.gear.${gear.__splatoon3ink_id}.name`, gear.name) }}
        </div>
      </div>

      <div class="flex justify-between">
        <div class="flex items-center space-x-px">
          <div :title="$t(`splatnet.powers.${gear.primaryGearPower.__splatoon3ink_id}.name`, gear.primaryGearPower.name)" class="bg-black rounded-full">
            <img :src="gear.primaryGearPower.image.url" class="h-8" />
          </div>

          <div v-for="(power, i) in gear.additionalGearPowers" :key="i" :title="$t(`splatnet.powers.${power.__splatoon3ink_id}.name`, power.name)" class="bg-black rounded-full">
            <img :src="power.image.url" class="h-6" />
          </div>
        </div>

        <div class="flex items-center space-x-2 bg-price w-28 pl-2 -mr-px">
          <div>
            <img src="@/assets/img/gesotown-coin.svg" />
          </div>
          <div class="font-splatoon1">
            {{ price }}
          </div>
        </div>
      </div>
    </div>

    <!-- Order button -->
    <div v-if="false" class="absolute top-0 right-0 hidden mobile:block">
      <a :href="shopUrl">
        <SquidTape
          class="font-splatoon2 text-sm text-black rounded-sm -rotate-2"
          bg="bg-splatoon-yellow"
          squid-bg="bg-black"
          border="border border-black"
        >
          <div class="px-1">
            {{ $t('gear.order') }}
          </div>
        </SquidTape>
      </a>
    </div>

    <!-- Price/Order button -->
    <div v-if="false" class="flex-none flex flex-col self-stretch items-end">
      <div class="flex-1">
        <div v-if="false" class="hidden mobile:block">
          <a :href="shopUrl">
            <SquidTape
              class="font-splatoon2 text-sm text-black rounded-sm -rotate-2"
              bg="bg-splatoon-yellow"
              squid-bg="bg-black"
              border="border border-black"
            >
              <div class="px-1">
                {{ $t('gear.order') }}
              </div>
            </SquidTape>
          </a>
        </div>
      </div>

      <div class="flex items-center space-x-2 bg-price w-28 pl-2 -mr-px">
        <div>
          <img src="@/assets/img/gesotown-coin.svg" />
        </div>
        <div class="font-splatoon1">
          {{ price }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import SquidTape from '../SquidTape.vue';
import { getGesotownGearUrl } from '@/common/links';
import { formatShortDurationFromNow } from '../../common/time';

const props = defineProps({
  gear: Object,
});

const price = computed(() => props.gear.price);
const gear = computed(() => props.gear.gear);

const shopUrl = computed(() => getGesotownGearUrl(props.gear.id));
</script>

<style scoped>
.bg-price {
  background-image: url('@/assets/img/gesotown-price-bg.png');
  background-repeat: no-repeat;
  background-size: 120px 31px;
  background-position: left;
}
</style>
