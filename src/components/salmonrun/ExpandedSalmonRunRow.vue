<template>
  <div v-if="schedule" class="font-splatoon2 space-y-1">
    <div class="flex gap-2">
      <img v-if="eggstra" src="@/assets/img/modes/coop.eggstra.svg" :title="$t('salmonrun.bigrun')" class="w-6 -mr-1" />

      <div class="text-lg text-shadow text-zinc-200 ss:hidden">
        {{ $d(schedule.startTime, 'dateTimeShort') }}
        &ndash;
        {{ $d(schedule.endTime, 'dateTimeShort') }}
      </div>

      <div class="hidden ss:block text-shadow text-white text-xl">
        <KingSalmonid v-if="!eggstra" :schedule="schedule" class="inline-block -mb-1 mr-2 drop-shadow-ruleIcon" />

        <div v-if="time.isUpcoming(schedule.startTime)" class="inline-block">
          {{ $t('salmonrun.opens') }}
          {{ $t('time.in', { time: formatDurationHoursFromNow(schedule.startTime, true) }) }}
        </div>
        <div v-else class="inline-block">
          {{ $t('time.remaining', { time: formatDurationHoursFromNow(schedule.endTime) }) }}
        </div>
      </div>

      <div
        v-if="schedule.isBigRun"
        class="bg-zinc-800 bg-opacity-80 text-sm text-white rounded-lg px-2 border-2 border-splatoon-bigRun"
      >
        <img src="@/assets/img/modes/coop.bigrun.svg" :title="$t('salmonrun.bigrun')" class="w-4 inline-block" />
        {{ $t('salmonrun.bigrun') }}
      </div>
    </div>

    <div v-if="!time.isUpcoming(schedule.startTime)" class="text-shadow text-zinc-300 ss:hidden">
      <KingSalmonid v-if="!eggstra" :schedule="schedule" class="inline-block align-middle drop-shadow-ruleIcon" />

      {{ $t('time.remaining', { time: formatDurationFromNow(schedule.endTime) }) }}
    </div>

    <div class="flex items-center space-x-2">
      <StageImage class="flex-1" img-class="rounded-lg" :stage="schedule.settings.coopStage" />

      <div class="flex flex-col items-center space-y-1">
        <div class="text-sm text-center text-shadow text-zinc-200">
          {{ $t('salmonrun.weapons') }}
        </div>

        <div class="bg-zinc-900 bg-opacity-30 rounded-full backdrop-blur-sm px-2">
          <SalmonRunWeapons :weapons="schedule.settings.weapons" weapon-class="w-10 sm:w-14" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useTimeStore } from '../../stores/time.mjs';
import StageImage from '../StageImage.vue';
import KingSalmonid from './KingSalmonid.vue';
import SalmonRunWeapons from './SalmonRunWeapons.vue';
import { formatDurationFromNow, formatDurationHoursFromNow } from '@/common/time';

defineProps({
  schedule: Object,
  eggstra: Boolean,
});

const time = useTimeStore();
</script>
