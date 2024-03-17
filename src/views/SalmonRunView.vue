<template>
  <MainLayout :title="$t('salmonrun.title')">
    <div class="grow flex items-center justify-center">
      <div class="mx-4 md:mx-12 w-full">
        <div class="flex items-center justify-center flex-col lg:flex-row lg:items-start space-y-10 lg:space-y-0 lg:space-x-16">
          <div class="w-full max-w-2xl">
            <SalmonRunBox class="md:-rotate-1" />
          </div>
          <div v-if="eggstraWork.currentSchedules.length" class="w-full max-w-2xl">
            <SalmonRunBox class="md:rotate-1" eggstra />
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import SalmonRunBox from '@/components/salmonrun/SalmonRunBox.vue';
import { useEggstraWorkSchedulesStore } from '@/stores/schedules.mjs';
import MainLayout from '@/layouts/MainLayout.vue';
const eggstraWork = useEggstraWorkSchedulesStore();
</script>
