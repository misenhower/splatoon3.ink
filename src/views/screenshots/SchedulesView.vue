<template>
  <ScreenshotLayout header="Map Schedules">
    <div class="grow flex items-center justify-center">
      <div class="flex space-x-6 mx-6">
        <ScreenshotScheduleBox type="regular" class="flex-1 -rotate-1" />
        <ScreenshotScheduleBox type="anarchySeries" class="flex-1 rotate-1" />
        <ScreenshotScheduleBox type="anarchyOpen" class="flex-1 -rotate-1" />
      </div>
    </div>
  </ScreenshotLayout>
</template>

<script setup>
import ScreenshotLayout from '../../layouts/ScreenshotLayout.vue';
import ScreenshotScheduleBox from '../../components/screenshots/ScreenshotScheduleBox.vue';
</script>
