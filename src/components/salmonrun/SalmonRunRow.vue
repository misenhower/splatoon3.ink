<template>
  <div v-if="schedule" class="font-splatoon2 space-y-1">
    <div class="flex items-center">
      <div>
        <img v-if="schedule.isBigRun" src="@/assets/img/modes/coop.bigrun.svg" :title="$t('salmonrun.bigrun')" class="w-6 mr-1" />
        <img v-else src="@/assets/img/modes/coop.svg" :title="$t('salmonrun.title')" class="w-6 mr-1" />
      </div>

      <div class="flex-1 text-shadow text-zinc-200">
        {{ $d(schedule.startTime, 'dateTimeShortWeekday') }}
        &ndash;
        {{ $d(schedule.endTime, 'dateTimeShort') }}
      </div>

      <div class="hidden sm:block text-xs bg-zinc-100/80 rounded-sm text-black px-2">
        {{ $t('time.in', { time: formatDurationFromNow(schedule.startTime, true) }) }}
      </div>
    </div>

    <div class="flex items-center space-x-2">
      <StageImage class="w-1/5" img-class="rounded-sm" :stage="schedule.settings.coopStage" hide-label />

      <div class="flex-1 text-sm text-zinc-300 text-shadow">
        <KingSalmonid :schedule="schedule" class="inline-block align-middle drop-shadow-ruleIcon" size="w-5" />

        {{ $t(`splatnet.stages.${schedule.settings.coopStage.id}.name`, schedule.settings.coopStage.name) }}

        <span v-if="schedule.isBigRun" class="text-xs inline-block bg-splatoon-bigRun/80 text-white rounded-sm px-2">
          {{ $t('salmonrun.bigrun') }}
        </span>
      </div>

      <div class="flex flex-col items-center space-y-1">
        <SalmonRunWeapons :weapons="schedule.settings.weapons" weapon-class="w-8 sm:w-10" />
      </div>
    </div>
  </div>
</template>

<script setup>
import KingSalmonid from './KingSalmonid.vue';
import SalmonRunWeapons from './SalmonRunWeapons.vue';
import StageImage from '@/components/StageImage.vue';
import { formatDurationFromNow } from '@/common/time';

defineProps({
  schedule: Object,
});
</script>
