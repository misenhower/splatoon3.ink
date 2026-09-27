<template>
  <MainLayout :title="$t('gear.title')">
    <PageDataState :sources="sources">
      <div class="mx-4 md:mx-12 w-full">
        <div class="flex items-center justify-center flex-col lg:flex-row lg:items-start space-y-10 lg:space-y-0 lg:space-x-16">
          <div class="w-full max-w-sm xl:max-w-md shrink-0">
            <DailyDropGear class="w-full md:-rotate-1" />
          </div>

          <div class="w-full max-w-3xl lg:flex-1 min-w-0">
            <RegularGear class="md:rotate-1" />
          </div>
        </div>
      </div>

      <template #loading>
        <GearSkeleton />
      </template>
    </PageDataState>
  </MainLayout>
</template>

<script setup>
import GearSkeleton from './GearSkeleton.vue';
import PageDataState from '@/components/loading/PageDataState.vue';
import { useGearDataStore } from '@/stores/data.mjs';
import DailyDropGear from '@/components/gear/DailyDropGear.vue';
import RegularGear from '@/components/gear/RegularGear.vue';
import MainLayout from '@/layouts/MainLayout.vue';

const sources = [useGearDataStore()];
</script>
