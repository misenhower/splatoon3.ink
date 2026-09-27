<template>
  <ProductContainer
    v-if="loading || winner"
    class="pt-10 pb-4"
    :bg="loading ? 'bg-camo-purple bg-splatoon-purple' : 'bg-camo-purple'"
    :bg-style="loading ? undefined : `background-color: ${toRgba(winner.color)};`"
  >
    <div class="space-y-2">
      <div class="font-splatoon1 text-2xl lg:text-3xl text-shadow mx-2">
        {{ $t('festival.results.title') }}
      </div>

      <div class="mx-2 px-1 bg-zinc-700/50 backdrop-blur-xs rounded-lg">
        <div class="flex justify-center md:justify-center py-2">
          <div class="w-36 sm:mx-4 lg:-mx-1" />
          <template v-for="(team, i) in loading ? [null, null, null] : festival.teams" :key="team?.id ?? i">
            <div class="w-12 mx-2 sm:w-20 flex justify-center py-1 rounded-sm" :style="loading ? undefined : `background-color: ${toRgba(team.color)};`">
              <SkeletonBlock v-if="loading" class="w-6 h-6" />
              <img v-else :src="team.image.url" class="w-6 h-6" loading="lazy" />
            </div>
          </template>
        </div>

        <template v-for="row in resultRows" :key="row.title">
          <div class="flex justify-center font-splatoon2 text-shadow text-center text-sm lg:text-base py-1 items-center">
            <div class="w-36 sm:mx-2">
              {{ $t(row.title) }}
            </div>

            <div class="flex bg-zinc-700/70 rounded-full py-1">
              <div v-for="(result, i) in row.results" :key="i" class="w-16 lg:w-20 sm:mx-2">
                <SkeletonBlock v-if="loading" class="h-5 lg:h-6 mx-auto w-12" />
                <div v-else :class="result.isTop ? 'text-splatoon-yellow' : 'text-zinc-300'">
                  {{ (result.ratio * 100).toFixed(2) }}%
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="font-splatoon2 text-splatoon-yellow text-center text-shadow text-sm lg:text-base mx-2 ss:hidden">
        <SkeletonBlock v-if="loading" class="h-5 lg:h-6 w-48 mx-auto" />
        <template v-else>
          {{ $t('festival.results.won', { team: $t(`splatnet.festivals.${ festival.__splatoon3ink_id }.teams.${winnerIndex}.teamName`, winner.teamName) }) }}
        </template>
      </div>
    </div>
  </ProductContainer>
</template>

<script setup>
import SkeletonBlock from './loading/SkeletonBlock.vue';
import { computed } from 'vue';
import ProductContainer from './ProductContainer.vue';

const props = defineProps({
  festival: Object,
  loading: Boolean,
});

function toRgba(color) {
  return `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${color.a})`;
}

function results(ratioKey, topKey) {
  if (props.loading) return [null, null, null];

  return props.festival.teams.map(team => ({
    ratio: team.result[ratioKey],
    isTop: team.result[topKey],
  }));
}

const resultRows = computed(() => {
  const rows = [
    {
      title: 'festival.results.conchshells',
      results: results('horagaiRatio', 'isHoragaiRatioTop'),
    },
    {
      title: 'festival.results.votes',
      results: results('voteRatio', 'isVoteRatioTop'),
    },
    {
      title: 'festival.results.open',
      results: results('regularContributionRatio', 'isRegularContributionRatioTop'),
    },
    {
      title: 'festival.results.pro',
      results: results('challengeContributionRatio', 'isChallengeContributionRatioTop'),
    },
  ];

  if (props.loading || props.festival.teams.find(t => t.result.tricolorContributionRatio !== null)) {
    rows.push({
      title: 'festival.results.tricolor',
      results: results('tricolorContributionRatio', 'isTricolorContributionRatioTop'),
    });
  }

  return rows;
});

const winnerIndex = computed(() => props.festival?.teams.findIndex(t => t.result.isWinner) ?? -1);
const winner = computed(() => winnerIndex.value >= 0 ? props.festival.teams[winnerIndex.value] : null);
</script>

<style scoped>
:deep(.bg-camo-purple) {
  background-image: url('@/assets/img/camo-transparent-bg.png'),
    linear-gradient(180deg, rgba(2, 0, 36, 0.10) 0%, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.25) 100%);
  background-size: cover;
}
</style>
