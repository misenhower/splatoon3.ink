<template>
  <ProductContainer class="pt-10 pb-4" bg="bg-camo-purple" :bgStyle="`background-color: ${toRgba(winner.color)};`">
    <div class="space-y-2">
      <div class="font-splatoon1 text-3xl mx-2">
        Results!
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
              {{ row.title }}
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

      <div class="font-splatoon2 text-splatoon-yellow text-center mx-2 ss:hidden">
        Team {{ winner.teamName }} Wins!
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
  return [
    {
      title: 'Conch Shells',
      results: results('horagaiRatio', 'isHoragaiRatioTop'),
    },
    {
      title: 'Votes',
      results: results('voteRatio', 'isVoteRatioTop'),
    },
    {
      title: 'Open',
      results: results('regularContributionRatio', 'isRegularContributionRatioTop'),
    },
    {
      title: 'Pro',
      results: results('challengeContributionRatio', 'isChallengeContributionRatioTop'),
    },
  ];
});

const winner = computed(() => props.festival.teams.find(t => t.result.isWinner));
</script>

<style scoped>
:deep(.bg-camo-purple) {
  background-image: url('@/assets/img/camo-transparent-bg.png'),
    linear-gradient(180deg, rgba(2, 0, 36, 0.10) 0%, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.25) 100%);
  background-size: cover;
}
</style>
