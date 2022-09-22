<template>
  <MainLayout title="Map Schedules">
    <div class="grow flex items-center justify-center">
      <div class="mx-4 md:mx-12 max-w-screen-2xl w-full">
        <div class="flex flex-col space-y-6 md:flex-row md:space-x-6 md:space-y-0">
          <ScheduleBox type="regular" class="flex-1 md:-rotate-1" />
          <ScheduleBox type="anarchySeries" class="flex-1 md:rotate-1" />
          <ScheduleBox type="anarchyOpen" class="flex-1 md:-rotate-1" />
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import MainLayout from '@/layouts/MainLayout.vue'
import ScheduleBox from '../components/ScheduleBox.vue';
</script>
