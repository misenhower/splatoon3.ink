<template>
  <div class="font-splatoon2 space-y-1" v-if="props.schedule">
    <div class="flex items-center">
      <div>
        <img src="@/assets/img/modes/coop.svg" class="w-6 mr-1" />
      </div>

      <div class="flex-1 text-shadow text-zinc-200">
        {{ formatDateTime(props.schedule.startTime) }}
        &ndash;
        {{ formatDateTime(props.schedule.endTime) }}
      </div>

      <div class="hidden sm:block text-xs bg-zinc-100 bg-opacity-80 rounded text-black px-2">
        in
        {{ formatDurationFromNow(props.schedule.startTime, true) }}
      </div>
    </div>

    <div class="flex items-center space-x-2">
      <StageImage class="w-1/5" imgClass="rounded" :stage="props.schedule.settings.coopStage" hide-label />

      <div class="flex-1 text-sm text-zinc-300 text-shadow">
        {{ props.schedule.settings.coopStage.name }}
      </div>

      <div class="flex flex-col items-center space-y-1">
        <SalmonRunWeapons :weapons="props.schedule.settings.weapons" weaponClass="w-8 sm:w-10" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatDateTime, formatDurationFromNow } from '@/common/time';
import StageImage from '../StageImage.vue';
import SalmonRunWeapons from './SalmonRunWeapons.vue';

const props = defineProps({
  schedule: Object,
});
</script>
