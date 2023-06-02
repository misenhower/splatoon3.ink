<template>
  <template v-if="currentSchedule" class="flex flex-row flex-1">
    <ProductContainer :bg="type.bg" class="w-full pt-10 pb-4">
      <div class="space-y-2">
        <div class="flex items-center space-x-2 mx-2">
          <img :src="type.img" />
            <div class="font-splatoon1 lg:text-2xl xl:text-3xl text-shadow">
              {{ $t(`splatnet.events.${currentSchedule.settings.leagueMatchEvent.id}.name`, currentSchedule.settings.leagueMatchEvent.name) }}

              <div class="font-splatoon2 lg:text-md xl:text-xl text-shadow">
                {{ $t(`splatnet.events.${currentSchedule.settings.leagueMatchEvent.id}.desc`, currentSchedule.settings.leagueMatchEvent.desc) }}
              </div>
            </div>
          </div>

          <div class="bg-zinc-900 bg-opacity-70 backdrop-blur-sm pt-2 pb-6 px-2 mx-1 rounded-lg space-y-2">
            <div class="flex items-center justify-between font-splatoon2">
            <div class="flex items-center space-x-2 text-sm lg:text-lg">
              <template v-if="currentSchedule">
                <div>
                  <RuleIcon :rule="currentSchedule.settings.vsRule" class="h-5 lg:h-6" />
                </div>
                <div class="text-shadow">{{ $t(`splatnet.rules.${currentSchedule.settings.vsRule.id}.name`, currentSchedule.settings.vsRule.name) }}</div>
              </template>

              <template v-else>
                <div class="w-32 bg-zinc-600 rounded animate-pulse">&nbsp;</div>
              </template>
            </div>

            <div class="justify-end text-xs lg:text-sm bg-zinc-100 bg-opacity-80 rounded text-black px-2">
              {{ $d(currentSchedule.startTime, 'dateTimeShortWeekday') }}
              &ndash;
              {{ $d(currentSchedule.endTime, 'dateTimeShort') }}
            </div>
          </div>

          <div class="flex space-x-1">
            <StageImage
              class="flex-1"
              imgClass="rounded-l-xl"
              :stage="currentSchedule.settings?.vsStages[0]"
            />
            <StageImage
              class="flex-1"
              imgClass="rounded-r-xl"
              :stage="currentSchedule.settings?.vsStages[1]"
            />
          </div>

          <div class="mx-2 space-y-2" v-if="currentSchedule.timePeriods.slice(1).length > 0">
            <SquidTape class="font-splatoon2 text-sm drop-shadow -rotate-6 -mx-2 mt-5">
              <div class="px-2">{{ $t('events.available') }}</div>
            </SquidTape>

            <div class="divide-y-2 divide-dashed divide-zinc-400 font-splatoon">
              <div v-for="next in currentSchedule.timePeriods.slice(1)" class="flex flex-row justify-center">
                <ChallengeScheduleRow :rule="currentSchedule.settings.vsRule" :key=next.startTime :schedule="next" class="my-2"/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProductContainer>
  </template>
</template>

<script setup>
import { computed } from 'vue';
import ProductContainer from '../ProductContainer.vue';
import StageImage from '../StageImage.vue';
import RuleIcon from '../RuleIcon.vue';
import SquidTape from '../SquidTape.vue';
import { useScheduleTypes } from '../concerns/scheduleTypes.mjs';
import ChallengeScheduleRow from './ChallengeScheduleRow.vue';

const props = defineProps({
  type: {
    type: String,
    required: true,
  },
  currentSchedule: {
    required: true
  }
});

const { types } = useScheduleTypes();

const type = computed(() => types[props.type]);
</script>

<style scoped>
:deep(.bg-tapes) {
  background-image: url('@/assets/img/tapes-transparent.png'),
    linear-gradient(180deg, rgba(2, 0, 36, 0.10) 0%, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.25) 100%);
  background-size: contain;
}
</style>
