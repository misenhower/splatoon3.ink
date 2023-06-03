<template>
  <template v-if="event && timePeriod">
    <div class="flex items-center w-full font-splatoon2" :class="isCurrent ? 'text-zinc-100' : 'text-zinc-300 opacity-60'">
        <RuleIcon :rule="event.settings.vsRule" class="h-5 lg:h-6" />
        <div class="px-2 text-shadow whitespace-pre">
            {{ $d(timePeriod.startTime, 'dateTimeShortWeekday') }}
            &ndash;
            {{ $d(timePeriod.endTime, 'dateTimeShort') }}
        </div>

        <div class="flex justify-end w-full" v-if="isCurrent">
            <div class="hidden sm:block text-xs bg-zinc-100 bg-opacity-80 rounded text-black px-2">
              <template v-if="isActive">
                {{ $t('time.remaining', { time: formatDurationFromNow(event.activeTimePeriod.endTime) }) }}
              </template>
              <template v-else>
                {{ $t('time.in', { time: formatDurationFromNow(timePeriod.startTime, true) }) }}
              </template>
            </div>
        </div>
    </div>
  </template>
</template>

<script setup>
import { computed } from 'vue';
import RuleIcon from '../RuleIcon.vue';
import { formatDurationFromNow } from '@/common/time';
import { useTimeStore } from '../../stores/time.mjs';

const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
  timePeriod: {
    type: Object,
    required: true,
  },
});

const time = useTimeStore();
const isCurrent = computed(() => time.isCurrent(props.timePeriod.endTime));
const isActive = computed(() => time.isActive(props.timePeriod.startTime, props.timePeriod.endTime));
</script>
