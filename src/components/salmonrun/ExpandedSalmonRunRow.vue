<template>
  <div v-if="loading || schedule" class="font-splatoon2 space-y-1">
    <div class="flex gap-2">
      <img
        v-if="eggstra"
        width="40"
        height="40"
        src="@/assets/img/modes/coop.eggstra.svg"
        :title="$t('salmonrun.bigrun')"
        class="w-6 -mr-1"
      />

      <SkeletonBlock v-if="loading" class="h-7 w-full" />
      <div v-else class="text-lg text-shadow text-zinc-200 ss:hidden">
        {{ $d(schedule.startTime, 'dateTimeShort') }}
        &ndash;
        {{ $d(schedule.endTime, 'dateTimeShort') }}
      </div>

      <div v-if="!loading" class="hidden ss:block text-shadow text-white text-xl">
        <KingSalmonid v-if="!eggstra" :schedule="schedule" class="inline-block -mb-1 mr-2 drop-shadow-ruleIcon" />

        <div v-if="time.isUpcoming(schedule.startTime)" class="inline-block">
          {{ $t('salmonrun.opens') }}
          {{ $t('time.in', { time: formatShortDurationFromNow(schedule.startTime, true, true) }) }}
        </div>
        <div v-else class="inline-block">
          {{ $t('time.remaining', { time: formatDurationHoursFromNow(schedule.endTime) }) }}
        </div>
      </div>

      <div
        v-if="!loading && schedule.isBigRun"
        class="bg-zinc-800/80 text-sm text-white rounded-lg px-2 border-2 border-splatoon-bigRun"
      >
        <img
          width="25"
          height="22"
          src="@/assets/img/modes/coop.bigrun.svg"
          :title="$t('salmonrun.bigrun')"
          class="w-4 inline-block"
        />
        {{ $t('salmonrun.bigrun') }}
      </div>
    </div>

    <div v-if="loading || !time.isUpcoming(schedule.startTime)" class="text-shadow text-zinc-300 ss:hidden">
      <SkeletonBlock v-if="loading" class="inline-block align-middle h-6 w-40" />
      <template v-else>
        <KingSalmonid v-if="!eggstra" :schedule="schedule" class="inline-block align-middle drop-shadow-ruleIcon" />

        {{ $t('time.remaining', { time: formatDurationFromNow(schedule.endTime) }) }}
      </template>
    </div>

    <div class="flex items-center space-x-2">
      <StageImage class="flex-1" img-class="rounded-lg" :stage="schedule?.settings.coopStage" :loading="loading" />

      <div class="flex flex-col items-center space-y-1">
        <div class="text-sm text-center text-shadow text-zinc-200">
          {{ $t('salmonrun.weapons') }}
        </div>

        <div class="bg-zinc-900/30 rounded-full backdrop-blur-xs px-2">
          <SalmonRunWeapons :weapons="schedule?.settings.weapons" :loading="loading" weapon-class="w-10 sm:w-14" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import SkeletonBlock from '@/components/loading/SkeletonBlock.vue';
import KingSalmonid from './KingSalmonid.vue';
import SalmonRunWeapons from './SalmonRunWeapons.vue';
import { useTimeStore } from '@/stores/time.mjs';
import StageImage from '@/components/StageImage.vue';
import { formatDurationFromNow, formatDurationHoursFromNow, formatShortDurationFromNow } from '@/common/time';

defineProps({
  schedule: Object,
  loading: Boolean,
  eggstra: Boolean,
});

const time = useTimeStore();
</script>
