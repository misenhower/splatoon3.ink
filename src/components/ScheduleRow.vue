<template>
  <div class="space-y-2">
    <div class="font-splatoon2 sm:hidden" v-if="props.schedule">
      <div class="flex items-center space-x-2">
        <div>
          <RuleIcon :rule="props.schedule.settings.vsRule" class="h-5" />
        </div>
        <div class="text-shadow">
          {{ $t(`splatnet.rules.${props.schedule.settings.vsRule.id}.name`, props.schedule.settings.vsRule.name) }}
        </div>
        <div class="text-shadow text-right flex-1">
          <div class="text-sm" v-if="time.isUpcoming(props.schedule.startTime)">
            {{ $t('time.in', { time: formatDurationFromNow(props.schedule.startTime) }) }}
          </div>

          <div class="text-xs text-zinc-300">
            {{ $d(props.schedule.startTime, 'time') }}
            &ndash;
            {{ $d(props.schedule.endTime, 'time') }}
          </div>
        </div>
      </div>
    </div>
    <div class="sm:hidden bg-zinc-500 rounded animate-pulse w-32" v-else>
      &nbsp;
    </div>

    <div class="flex space-x-1">
      <div class="flex-1 items-center text-center font-splatoon2 hidden sm:flex">
        <div class="w-full space-y-1">
          <template v-if="props.schedule">
            <div class="flex items-center justify-center space-x-2">
              <div>
                <RuleIcon :rule="props.schedule.settings.vsRule" class="h-5 lg:h-6" />
              </div>
              <div class="text-xs lg:text-lg text-shadow">
                {{ $t(`splatnet.rules.${props.schedule.settings.vsRule.id}.name`, props.schedule.settings.vsRule.name) }}
              </div>
            </div>

            <div class="text-sm text-zinc-300 text-shadow">
              <template v-if="time.isUpcoming(props.schedule.startTime)">
                {{ $t('time.in', { time: formatDurationFromNow(props.schedule.startTime) }) }}
              </template>
              <template v-else>
                {{ $t('time.remaining', { time: formatDurationFromNow(props.schedule.endTime) }) }}
              </template>
            </div>

            <div class="text-sm text-zinc-300 text-shadow">
              {{ $d(props.schedule.startTime, 'time') }}
              &ndash;
              {{ $d(props.schedule.endTime, 'time') }}
            </div>
          </template>

          <template v-else>
            <div class="text-xs lg:text-lg bg-zinc-500 rounded animate-pulse">&nbsp;</div>
            <div class="text-sm mx-8 bg-zinc-500 rounded animate-pulse">&nbsp;</div>
            <div class="text-sm mx-4 bg-zinc-500 rounded animate-pulse">&nbsp;</div>
          </template>
        </div>
      </div>

      <div class="flex-1">
        <StageImage class="flex-1" imgClass="rounded-l-xl" textSize="text-xs" :stage="props.schedule?.settings.vsStages[0]" />
      </div>

      <div class="flex-1">
        <StageImage class="flex-1" imgClass="rounded-r-xl" textSize="text-xs" :stage="props.schedule?.settings.vsStages[1]" />
      </div>
    </div>
  </div>
</template>

<script setup>
import StageImage from './StageImage.vue';
import RuleIcon from './RuleIcon.vue';
import { formatDurationFromNow } from '../common/time';
import { useTimeStore } from '../stores/time.mjs';

const props = defineProps({
  schedule: {
    required: true,
  },
});

const time = useTimeStore();
</script>
