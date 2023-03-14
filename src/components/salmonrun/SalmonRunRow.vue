<template>
  <div class="font-splatoon2 space-y-1" v-if="schedule">
    <div class="flex items-center">
      <div>
        <img src="@/assets/img/modes/coop.bigrun.svg" :title="$t('salmonrun.bigrun')" class="w-6 mr-1" v-if="schedule.isBigRun" />
        <img src="@/assets/img/modes/coop.svg" :title="$t('salmonrun.title')" class="w-6 mr-1" v-else />
      </div>

      <div class="flex-1 text-shadow text-zinc-200">
        {{ $d(schedule.startTime, 'dateTimeShortWeekday') }}
        &ndash;
        {{ $d(schedule.endTime, 'dateTimeShort') }}
      </div>

      <div class="hidden sm:block text-xs bg-zinc-100 bg-opacity-80 rounded text-black px-2">
        {{ $t('time.in', { time: formatDurationFromNow(schedule.startTime, true) }) }}
      </div>
    </div>

    <div class="flex items-center space-x-2">
      <StageImage class="w-1/5" imgClass="rounded" :stage="schedule.settings.coopStage" hide-label />

      <div class="flex-1 text-sm text-zinc-300 text-shadow">
        <KingSalmonid :schedule="schedule" class="inline-block align-middle" size="w-5" />

        {{ $t(`splatnet.stages.${schedule.settings.coopStage.id}.name`, schedule.settings.coopStage.name) }}

        <span class="text-xs inline-block bg-splatoon-bigRun bg-opacity-80 text-white rounded px-2" v-if="schedule.isBigRun">
          {{ $t('salmonrun.bigrun') }}
        </span>
      </div>

      <div class="flex flex-col items-center space-y-1">
        <SalmonRunWeapons :weapons="schedule.settings.weapons" weaponClass="w-8 sm:w-10" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatDurationFromNow } from '@/common/time';
import StageImage from '../StageImage.vue';
import KingSalmonid from './KingSalmonid.vue';
import SalmonRunWeapons from './SalmonRunWeapons.vue';

defineProps({
  schedule: Object,
});
</script>
