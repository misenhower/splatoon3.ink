<template>
  <div class="font-splatoon2 space-y-1" v-if="props.schedule">
    <div>
      <div class="text-lg text-shadow text-zinc-200 ss:hidden">
        {{ $d(props.schedule.startTime, 'dateTimeShort') }}
        &ndash;
        {{ $d(props.schedule.endTime, 'dateTimeShort') }}
      </div>
      <div class="text-shadow text-zinc-300 ss:hidden">
        {{ formatDurationFromNow(props.schedule.endTime) }} {{ $t('time.remaining') }}
      </div>
      <div class="hidden ss:block text-shadow text-white text-xl">
        {{ formatDurationHoursFromNow(props.schedule.endTime) }} {{ $t('time.remaining') }}
      </div>
    </div>

    <div class="flex items-center space-x-2">
      <StageImage class="flex-1" imgClass="rounded-lg" :stage="props.schedule.settings.coopStage" />

      <div class="flex flex-col items-center space-y-1">
        <div class="text-sm text-center text-shadow text-zinc-200">
          {{ $t('salmonrun.weapons') }}
        </div>

        <div class="bg-zinc-900 bg-opacity-30 rounded-full backdrop-blur-sm px-2">
          <SalmonRunWeapons
            :weapons="props.schedule.settings.weapons"
            weaponClass="w-10 sm:w-14"
            />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatDurationFromNow, formatDurationHoursFromNow } from '@/common/time';
import StageImage from '../StageImage.vue';
import SalmonRunWeapons from './SalmonRunWeapons.vue';

const props = defineProps({
  schedule: Object,
});
</script>
