<template>
  <div class="font-splatoon2 space-y-1" v-if="schedule">
    <div class="flex gap-2">
      <div class="text-lg text-shadow text-zinc-200 ss:hidden">
        {{ $d(schedule.startTime, 'dateTimeShort') }}
        &ndash;
        {{ $d(schedule.endTime, 'dateTimeShort') }}
      </div>

      <div class="hidden ss:block text-shadow text-white text-xl">
        <KingSalmonid :schedule="schedule" class="inline-block -mb-1 mr-2" v-if="!eggstra"/>

        <div class="inline-block" v-if="time.isUpcoming(schedule.startTime)">
          Shift opens
          {{ $t('time.in', { time: formatDurationHoursFromNow(schedule.startTime, true) }) }}
        </div>
        <div class="inline-block" v-else>
          {{ $t('time.remaining', { time: formatDurationHoursFromNow(schedule.endTime) }) }}
        </div>
      </div>

      <div
        class="bg-zinc-800 bg-opacity-80 text-sm text-white rounded-lg px-2 border-2 border-splatoon-bigRun"
        v-if="schedule.isBigRun">
        <img src="@/assets/img/modes/coop.bigrun.svg" :title="$t('salmonrun.bigrun')" class="w-4 inline-block" />
        {{ $t('salmonrun.bigrun') }}
      </div>
    </div>

    <div class="text-shadow text-zinc-300 ss:hidden" v-if="!time.isUpcoming(schedule.startTime)">
      <KingSalmonid :schedule="schedule" class="inline-block align-middle" v-if="!eggstra" />

      {{ $t('time.remaining', { time: formatDurationFromNow(schedule.endTime) }) }}
    </div>

    <div class="flex items-center space-x-2">
      <StageImage class="flex-1" imgClass="rounded-lg" :stage="schedule.settings.coopStage" />

      <div class="flex flex-col items-center space-y-1">
        <div class="text-sm text-center text-shadow text-zinc-200">
          {{ $t('salmonrun.weapons') }}
        </div>

        <div class="bg-zinc-900 bg-opacity-30 rounded-full backdrop-blur-sm px-2">
          <SalmonRunWeapons
            :weapons="schedule.settings.weapons"
            weaponClass="w-10 sm:w-14"
            />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatDurationFromNow, formatDurationHoursFromNow } from '@/common/time';
import { useTimeStore } from '../../stores/time.mjs';
import StageImage from '../StageImage.vue';
import KingSalmonid from './KingSalmonid.vue';
import SalmonRunWeapons from './SalmonRunWeapons.vue';

defineProps({
  schedule: Object,
  eggstra: Boolean,
});

const time = useTimeStore();
</script>
