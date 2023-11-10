<template>
  <ProductContainer class="pt-10 pb-4" bg="bg-zinc-500 bg-camo-purple">
    <div class="space-y-2">
      <div class="font-splatoon1 text-2xl xl:text-3xl text-shadow mx-2">
        {{ $t(title) }}
        {{ regions.length < 4 ? ` (${regions.join('/')})` : '' }}
      </div>

      <div class="flex justify-center mx-2">
        <div class="font-splatoon2 text-zinc-200 text-center text-shadow text-sm lg:text-lg bg-zinc-700 px-4 py-1 rounded-full bg-opacity-50 backdrop-blur-sm">
          {{ $t(`splatnet.festivals.${festival.__splatoon3ink_id}.title`, festival.title) }}
        </div>
      </div>

      <div>
        <img :src="props.festival.image.url" />

        <div class="flex -mt-3 mb-4">
          <template v-for="(team, i) in festival.teams" :key="team.id">
            <div class="flex-1 flex justify-center items-center">
              <SquidTape class="font-splatoon2 text-shadow text-sm lg:text-base -rotate-3" bg="" :style="`background-color: ${toRgba(team.color)};`">
                <div class="px-2">
                  {{ $t(`splatnet.festivals.${ festival.__splatoon3ink_id }.teams.${i}.teamName`, team.teamName) }}
                </div>
              </SquidTape>
            </div>
          </template>
        </div>
      </div>

      <div class="font-splatoon2 text-splatoon-yellow text-center text-sm lg:text-base text-shadow mx-2 ss:hidden">
        {{ $d(festival.startTime, 'dateTimeShortWeekday') }}
        &ndash;
        {{ $d(festival.endTime, 'dateTimeShortWeekday') }}
      </div>
    </div>
  </ProductContainer>
</template>

<script setup>
import { computed } from 'vue';
import ProductContainer from './ProductContainer.vue';
import { STATUS_PAST, STATUS_ACTIVE, STATUS_UPCOMING } from '@/stores/splatfests';
import SquidTape from './SquidTape.vue';
import { useUSSplatfestsStore, useEUSplatfestsStore, useJPSplatfestsStore, useAPSplatfestsStore } from '@/stores/splatfests';

const props = defineProps({
  festival: Object,
  historyMode: Boolean,
});

const usSplatfests = useUSSplatfestsStore();
const euSplatfests = useEUSplatfestsStore();
const jpSplatfests = useJPSplatfestsStore();
const apSplatfests = useAPSplatfestsStore();

const regions = computed(() => {
  const availableRegions = [];
  const id = props.festival.__splatoon3ink_id;
  if (usSplatfests.festivals.map(f => f.__splatoon3ink_id).includes(id)) {
    availableRegions.push('NA');
  }
  if (euSplatfests.festivals.map(f => f.__splatoon3ink_id).includes(id)) {
    availableRegions.push('EU');
  }
  if (jpSplatfests.festivals.map(f => f.__splatoon3ink_id).includes(id)) {
    availableRegions.push('JP');
  }
  if (apSplatfests.festivals.map(f => f.__splatoon3ink_id).includes(id)) {
    availableRegions.push('AP');
  }
  return availableRegions;
})


const title = computed(() => {
  if (props.historyMode) {
    return 'festival.active';
  }
  switch (props.festival.status) {
    case STATUS_PAST:
      return 'festival.past';
    case STATUS_UPCOMING:
      return 'festival.upcoming';
    case STATUS_ACTIVE:
    default:
      return 'festival.active';
  }
});

function toRgba(color) {
  return `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${color.a})`;
}
</script>

<style scoped>
:deep(.bg-camo-purple) {
  background-image: url('@/assets/img/camo-transparent-bg.png'),
    linear-gradient(180deg, rgba(2, 0, 36, 0.10) 0%, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.25) 100%);
  background-size: cover;
}
</style>
