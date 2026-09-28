<template>
  <span :title="deadline" class="inline-block text-xs bg-zinc-200/30 rounded-sm px-1 py-px font-semibold">
    <template v-if="remainingSeconds < 60">
      {{ $t('time.left', { time: $t('time.seconds', { n: remainingSeconds }, remainingSeconds) }) }}
    </template>
    <template v-else>
      {{ $t('time.left', { time: formatDurationHoursFromNow(endTime) }) }}
    </template>
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatDurationHoursFromNow } from '@/common/time';
import { useTimeStore } from '@/stores/time.mjs';

const props = defineProps({
  endTime: { type: String, required: true },
});

const time = useTimeStore();
const { t, d } = useI18n();

const deadline = computed(() => t('time.until', {
  time: d(props.endTime, 'dateTimeShortWeekday'),
}));

const remainingSeconds = computed(() => {
  const remaining = Date.parse(props.endTime) - time.now;

  return Math.max(0, Math.ceil(remaining / 1000));
});
</script>
