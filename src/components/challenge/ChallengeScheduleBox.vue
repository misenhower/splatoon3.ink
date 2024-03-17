<template>
  <template v-if="event">
    <ProductContainer :bg="type.bg" class="w-full pt-10 pb-2">
      <div class="space-y-2">
        <div class="flex items-center space-x-2 mx-2">
          <img :src="type.img" />
          <div class="font-splatoon1 lg:text-2xl xl:text-3xl text-shadow">
            {{ $t(`splatnet.events.${event.settings.leagueMatchEvent.id}.name`, event.settings.leagueMatchEvent.name) }}

            <div class="font-splatoon2 lg:text-md xl:text-xl text-shadow whitespace-pre-line">
              {{ br2nl($t(`splatnet.events.${event.settings.leagueMatchEvent.id}.desc`, event.settings.leagueMatchEvent.desc)) }}
            </div>
          </div>
        </div>

        <div class="bg-zinc-900 bg-opacity-70 backdrop-blur-sm pt-2 pb-1 px-2 mx-2 rounded-lg space-y-2">
          <div class="flex items-center justify-between font-splatoon2">
            <div class="flex items-center space-x-2 text-sm lg:text-lg">
              <template v-if="event">
                <div>
                  <RuleIcon :rule="event.settings.vsRule" class="h-5 lg:h-6 drop-shadow-ruleIcon" />
                </div>
                <div class="text-shadow">
                  {{ $t(`splatnet.rules.${event.settings.vsRule.id}.name`, event.settings.vsRule.name) }}
                </div>
              </template>

              <template v-else>
                <div class="w-32 bg-zinc-600 rounded animate-pulse">
                  &nbsp;
                </div>
              </template>
            </div>

            <div v-if="event.activeTimePeriod">
              <SquidTape class="font-splatoon2 text-sm drop-shadow rotate-6">
                <div class="px-2">
                  {{ $t('events.now_open') }}
                </div>
              </SquidTape>
            </div>
          </div>

          <div class="flex space-x-1">
            <StageImage
              class="flex-1"
              img-class="rounded-l-xl"
              :stage="event.settings?.vsStages[0]"
            />
            <StageImage
              class="flex-1"
              img-class="rounded-r-xl"
              :stage="event.settings?.vsStages[1]"
            />
          </div>

          <div class="mx-2 space-y-2 ss:hidden">
            <!-- Past time periods -->
            <template v-if="event.pastTimePeriods?.length">
              <div class="divide-y-2 divide-dashed divide-zinc-600 font-splatoon">
                <div v-for="timePeriod in event.pastTimePeriods" :key="timePeriod.startTime" class="flex flex-row justify-center">
                  <ChallengeScheduleRow :event="event" :time-period="timePeriod" class="my-2" />
                </div>
              </div>
            </template>

            <!-- Current/future time periods -->
            <template v-if="event.currentTimePeriods?.length">
              <SquidTape class="font-splatoon2 text-sm drop-shadow -rotate-6 -mx-2 mt-4">
                <div class="px-2">
                  {{ event.activeTimePeriod ? $t('events.now') : $t('events.available') }}
                </div>
              </SquidTape>

              <div class="divide-y-2 divide-dashed divide-zinc-400 font-splatoon">
                <div v-for="timePeriod in event.currentTimePeriods" :key="timePeriod.startTime" class="flex flex-row justify-center">
                  <ChallengeScheduleRow :event="event" :time-period="timePeriod" class="my-2" />
                </div>
              </div>
            </template>
          </div>
        </div>

        <div class="font-splatoon2 mx-2 p-2 text-zinc-200 bg-zinc-900 bg-opacity-50 backdrop-blur-sm rounded-lg whitespace-pre-line">
          {{ br2nl($t(`splatnet.events.${event.settings.leagueMatchEvent.id}.regulation`, event.settings.leagueMatchEvent.regulation)) }}
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
import { br2nl } from '../../common/util.mjs';
import ChallengeScheduleRow from './ChallengeScheduleRow.vue';

const props = defineProps({
  type: {
    type: String,
    required: true,
  },
  event: {
    type: Object,
    required: true,
  },
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
