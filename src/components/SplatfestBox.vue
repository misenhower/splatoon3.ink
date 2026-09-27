<template>
  <ProductContainer class="pt-10 pb-4" bg="bg-zinc-500 bg-camo-purple">
    <div class="space-y-2">
      <div class="font-splatoon1 text-2xl xl:text-3xl text-shadow mx-2">
        {{ $t(title) }}
        <template v-if="!loading">
          {{ festival.regions.length < 4 ? ` (${festival.regions.join('/')})` : '' }}
        </template>
      </div>

      <div class="flex justify-center mx-2">
        <div class="font-splatoon2 text-zinc-200 text-center text-shadow text-sm lg:text-lg bg-zinc-700/50 px-4 py-1 rounded-full backdrop-blur-xs">
          <SkeletonBlock v-if="loading" class="h-5 lg:h-7 w-60 max-w-full" />
          <template v-else>
            {{ $t(`splatnet.festivals.${festival.__splatoon3ink_id}.title`, festival.title) }}
          </template>
        </div>
      </div>

      <div>
        <SkeletonBlock v-if="loading" class="aspect-[1740/680]" />
        <img
          v-else
          :src="props.festival.image.url"
          width="1740"
          height="680"
          loading="lazy"
        />

        <div class="flex -mt-3 mb-4">
          <template v-for="(team, i) in loading ? [null, null, null] : festival.teams" :key="team?.id ?? i">
            <div class="flex-1 flex justify-center items-center">
              <SquidTape class="font-splatoon2 text-shadow text-sm lg:text-base -rotate-3" bg="" :style="loading ? undefined : `background-color: ${toRgba(team.color)};`">
                <div class="px-2">
                  <SkeletonBlock v-if="loading" class="h-5 lg:h-6 w-12" />
                  <template v-else>
                    {{ $t(`splatnet.festivals.${ festival.__splatoon3ink_id }.teams.${i}.teamName`, team.teamName) }}
                  </template>
                </div>
              </SquidTape>
            </div>
          </template>
        </div>
      </div>

      <div class="font-splatoon2 text-splatoon-yellow text-center text-sm lg:text-base text-shadow mx-2 ss:hidden">
        <SkeletonBlock v-if="loading" class="h-5 lg:h-6 w-4/5 mx-auto" />
        <template v-else>
          {{ $d(festival.startTime, 'dateTimeShortWeekday') }}
          &ndash;
          {{ $d(festival.endTime, 'dateTimeShortWeekday') }}
        </template>
      </div>
    </div>
  </ProductContainer>
</template>

<script setup>
import SkeletonBlock from './loading/SkeletonBlock.vue';
import { computed } from 'vue';
import ProductContainer from './ProductContainer.vue';
import SquidTape from './SquidTape.vue';
import { STATUS_PAST, STATUS_ACTIVE, STATUS_UPCOMING } from '@/stores/splatfests';

const props = defineProps({
  festival: Object,
  historyMode: Boolean,
  loading: Boolean,
});

const title = computed(() => {
  if (props.historyMode || props.loading) {
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
