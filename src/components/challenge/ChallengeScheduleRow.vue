<template>
    <template v-if="rule && schedule">
    <div class="flex items-center w-full font-splatoon2">
        <RuleIcon :rule="rule" class="h-5 lg:h-6" />
        <div class="px-2 text-shadow md:whitespace-nowrap">
            {{ $d(schedule.startTime, 'dateTimeShortWeekday') }}
            &ndash;
            {{ $d(schedule.endTime, 'dateTimeShortWeekday') }}
        </div>

        <div class="flex justify-end w-full">
            <div class="hidden sm:block text-xs bg-zinc-100 bg-opacity-80 rounded text-black px-2">
                {{ $t('time.in', { time: formatDurationFromNow(schedule.startTime, true) }) }}
            </div>
        </div>
    </div>
    </template>
</template>

<script setup>
import RuleIcon from '../RuleIcon.vue';
import { formatDurationFromNow } from '@/common/time';

const props = defineProps({
  rule: {
    type: Object,
    required: true,
  },
  schedule: {
    type: Object,
    required: true,
  },
});
</script>