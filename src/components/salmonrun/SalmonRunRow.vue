<template>
  <div v-if="loading || schedule" class="font-splatoon2 space-y-1">
    <div class="flex items-center">
      <div>
        <img
          v-if="!loading && schedule.isBigRun"
          width="25"
          height="22"
          src="@/assets/img/modes/coop.bigrun.svg"
          :title="$t('salmonrun.bigrun')"
          class="w-6 mr-1"
        />
        <img
          v-else
          width="40"
          height="40"
          src="@/assets/img/modes/coop.svg"
          :title="$t('salmonrun.title')"
          class="w-6 mr-1"
        />
      </div>

      <div class="flex-1 text-shadow text-zinc-200">
        <SkeletonBlock v-if="loading" class="h-6 w-full" />
        <template v-else>
          {{ $d(schedule.startTime, 'dateTimeShortWeekday') }}
          &ndash;
          {{ $d(schedule.endTime, 'dateTimeShort') }}
        </template>
      </div>

      <div v-if="!loading" class="hidden sm:block text-xs bg-zinc-100/80 rounded-sm text-black px-2">
        {{ $t('time.in', { time: formatDurationFromNow(schedule.startTime, true) }) }}
      </div>
    </div>

    <div class="flex items-center space-x-2">
      <StageImage
        class="w-1/5"
        img-class="rounded-sm"
        :stage="schedule?.settings.coopStage"
        :loading="loading"
        hide-label
      />

      <div class="flex-1 text-sm text-zinc-300 text-shadow">
        <SkeletonBlock v-if="loading" class="inline-block align-middle h-10 sm:h-5 w-full" />
        <template v-else>
          <KingSalmonid :schedule="schedule" class="inline-block align-middle drop-shadow-ruleIcon" size="w-5" />

          {{ $t(`splatnet.stages.${schedule.settings.coopStage.id}.name`, schedule.settings.coopStage.name) }}

          <span v-if="!loading && schedule.isBigRun" class="text-xs inline-block bg-splatoon-bigRun/80 text-white rounded-sm px-2">
            {{ $t('salmonrun.bigrun') }}
          </span>
        </template>
      </div>

      <div class="flex flex-col items-center space-y-1">
        <SalmonRunWeapons :weapons="schedule?.settings.weapons" :loading="loading" weapon-class="w-8 sm:w-10" />
      </div>
    </div>
  </div>
</template>

<script setup>
import SkeletonBlock from '@/components/loading/SkeletonBlock.vue';
import KingSalmonid from './KingSalmonid.vue';
import SalmonRunWeapons from './SalmonRunWeapons.vue';
import StageImage from '@/components/StageImage.vue';
import { formatDurationFromNow } from '@/common/time';

defineProps({
  schedule: Object,
  loading: Boolean,
});
</script>
