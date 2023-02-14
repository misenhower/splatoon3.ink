<template>
  <ProductContainer class="pt-10 pb-4" bg="bg-camo-purple" :bgStyle="`background-color: ${toRgba(winner.color)};`">
    <div class="space-y-2">
      <div class="font-splatoon1 text-3xl text-shadow mx-2">
        {{ $t('festival.results.title') }}
      </div>

      <div class="mx-2 px-1 bg-zinc-700 bg-opacity-50 backdrop-blur-sm rounded-lg">
        <div class="flex justify-end py-2">
          <template v-for="team in festival.teams" :key="team.id">
            <div class="w-20 mx-2 flex justify-center py-1 rounded" :style="`background-color: ${toRgba(team.color)};`">
              <img :src="team.image.url" class="w-6 h-6" />
            </div>
          </template>
        </div>

        <template v-for="row in resultRows" :key="row.title">
          <div class="flex font-splatoon2 text-shadow text-center py-1 items-center">
            <div class="w-36 mx-2">
              {{ $t(row.title) }}
            </div>

            <div class="flex bg-zinc-700 bg-opacity-70 rounded-full py-1">
              <div class="w-20 mx-2" v-for="(result, i) in row.results" :key="i">
                <div :class="result.isTop ? 'text-splatoon-yellow' : 'text-zinc-300'">
                  {{ (result.ratio * 100).toFixed(2) }}%
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="font-splatoon2 text-splatoon-yellow text-center text-shadow mx-2 ss:hidden">
        {{ $t('festival.results.won', { team: $t(`splatnet.festivals.${ festival.__splatoon3ink_id }.teams.${winnerIndex}.teamName`, winner.teamName) }) }}
      </div>
    </div>
  </ProductContainer>
</template>

<script setup>
import { computed } from 'vue';
import ProductContainer from './ProductContainer.vue';

const props = defineProps({
  festival: Object,
});

function toRgba(color) {
  return `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${color.a})`;
}

function results(ratioKey, topKey) {
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

  if (props.festival.teams.find(t => t.result.tricolorContributionRatio !== null)) {
    rows.push({
      title: 'festival.results.tricolor',
      results: results('tricolorContributionRatio', 'isTricolorContributionRatioTop'),
    });
  }

  return rows;
});

const winnerIndex = computed(() => props.festival.teams.findIndex(t => t.result.isWinner));
const winner = computed(() => props.festival.teams[winnerIndex.value]);
</script>

<style scoped>
:deep(.bg-camo-purple) {
  background-image: url('@/assets/img/camo-transparent-bg.png'),
    linear-gradient(180deg, rgba(2, 0, 36, 0.10) 0%, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.25) 100%);
  background-size: cover;
}
</style>
