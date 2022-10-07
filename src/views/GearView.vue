<template>
  <MainLayout title="gear">
    <div class="grow flex items-center justify-center">
      <div class="mx-4 md:mx-12 w-full">
        <div class="flex items-center justify-center flex-col lg:flex-row lg:items-start space-y-10 lg:space-y-0 lg:space-x-16">
          <div class="flex-none">
            <DailyDropGear class="md:min-w-[24rem] max-w-sm xl:max-w-md md:-rotate-1" />
          </div>

          <div>
            <RegularGear class="md:rotate-1" />
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import MainLayout from '@/layouts/MainLayout.vue'
import DailyDropGear from '../components/gear/DailyDropGear.vue';
import RegularGear from '../components/gear/RegularGear.vue';
</script>
