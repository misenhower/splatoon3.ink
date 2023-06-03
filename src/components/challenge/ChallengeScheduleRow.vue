<template>
  <template v-if="event && timePeriod">
    <div class="flex items-center w-full font-splatoon2">
        <RuleIcon :rule="event.settings.vsRule" class="h-5 lg:h-6" />
        <div class="px-2 text-shadow whitespace-pre">
            {{ $d(timePeriod.startTime, 'dateTimeShortWeekday') }}
            &ndash;
            {{ $d(timePeriod.endTime, 'dateTimeShort') }}
        </div>

        <div class="flex justify-end w-full">
            <div class="hidden sm:block text-xs bg-zinc-100 bg-opacity-80 rounded text-black px-2">
                {{ $t('time.in', { time: formatDurationFromNow(timePeriod.startTime, true) }) }}
            </div>
        </div>
    </div>
  </template>
</template>

<script setup>
import RuleIcon from '../RuleIcon.vue';
import { formatDurationFromNow } from '@/common/time';

defineProps({
  event: {
    type: Object,
    required: true,
  },
  timePeriod: {
    type: Object,
    required: true,
  },
});
</script>
