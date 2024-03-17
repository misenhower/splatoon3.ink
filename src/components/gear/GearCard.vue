<template>
  <div class="relative">
    <img src="@/assets/img/gesotown-tape-blob-bg.png" />

    <div class="absolute inset-0 flex flex-col items-center justify-evenly my-4">
      <!-- Gear Image -->
      <div>
        <img :src="gear.image.url" class="h-20 w-20 lg:h-24 lg:w-24 xl:h-28 xl:w-28" />
      </div>

      <!-- Powers -->
      <div>
        <div class="flex items-center space-x-px">
          <div :title="$t(`splatnet.powers.${gear.primaryGearPower.__splatoon3ink_id}.name`, gear.primaryGearPower.name)" class="bg-black rounded-full">
            <img :src="gear.primaryGearPower.image.url" class="h-8" />
          </div>

          <div v-for="(power, i) in gear.additionalGearPowers" :key="i" :title="$t(`splatnet.powers.${power.__splatoon3ink_id}.name`, power.name)" class="bg-black rounded-full">
            <img :src="power.image.url" class="h-6" />
          </div>
        </div>
      </div>

      <!-- Name -->
      <div class="relative text-center">
        <div class="mx-6">
          <img src="@/assets/img/gesotown-tape.svg" />
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
          <img src="@/assets/img/gesotown-coin.svg" />
        </div>
        <div class="font-splatoon1">
          {{ price }}
        </div>
      </div>
    </div>

    <!-- Brand -->
    <div class="absolute top-0 right-10">
      <div class="relative rotate-2">
        <img src="@/assets/img/gesotown-brand-bg.png" class="w-10" />
        <div class="absolute inset-0 p-2">
          <img :src="gear.brand.image.url" class="w-full h-full" :title="$t(`splatnet.brands.${gear.brand.id}.name`, gear.brand.name)" />
        </div>
      </div>
    </div>

    <!-- Time left/Order button -->
    <div class="absolute top-1 left-6 space-y-2">
      <div v-if="false" class="hidden mobile:block -ml-4">
        <a :href="shopUrl">
          <SquidTape
            class="font-splatoon2 text-sm text-black rounded-sm -rotate-3"
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

      <div class="inline-block text-xs bg-zinc-200 bg-opacity-30 rounded px-1 py-px font-semibold">
        {{ $t('time.left', { time: formatShortDurationFromNow(props.gear.saleEndTime) }) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import SquidTape from '@/components/SquidTape.vue';
import { formatShortDurationFromNow } from '@/common/time';
import { getGesotownGearUrl } from '@/common/links';

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
