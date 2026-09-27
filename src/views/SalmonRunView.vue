<template>
  <MainLayout :title="$t('salmonrun.title')">
    <PageDataState :sources="sources" variant="salmonrun">
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
    </PageDataState>
  </MainLayout>
</template>

<script setup>
import PageDataState from '@/components/loading/PageDataState.vue';
import { useSchedulesDataStore } from '@/stores/data.mjs';
import SalmonRunBox from '@/components/salmonrun/SalmonRunBox.vue';
import { useEggstraWorkSchedulesStore } from '@/stores/schedules.mjs';
import MainLayout from '@/layouts/MainLayout.vue';
const eggstraWork = useEggstraWorkSchedulesStore();

const sources = [useSchedulesDataStore()];
</script>
