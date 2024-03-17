<template>
  <ScreenshotLayout header="Challenges">
    <div class="grow flex items-center justify-center scale-[1.1]">
      <ChallengeScheduleBox
        v-if="store.activeSchedule"
        :event="store.activeSchedule"
        type="challenge"
        class="w-full max-w-xl -rotate-1"
      />
    </div>
  </ScreenshotLayout>
</template>

<script setup>
import ScreenshotLayout from '../../layouts/ScreenshotLayout.vue';
import ChallengeScheduleBox from '@/components/challenge/ChallengeScheduleBox.vue';
import { useEventSchedulesStore } from '@/stores/schedules.mjs';

const store = useEventSchedulesStore();
</script>
