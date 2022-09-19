<template>
  <MainLayout title="SplatNet Gear">
    <div class="grow flex items-center justify-center">
      <div class="mx-4 md:mx-12 max-w-screen-xl w-full">
        <div class="flex items-center flex-col lg:flex-row space-y-10 lg:space-y-0 lg:space-x-16">
          <div class="max-w-sm xl:max-w-md">
            <DailyDropGear class="md:-rotate-1" />
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
import { useDataStore } from '../stores/data';
import { onMounted } from 'vue';
import DailyDropGear from '../components/gear/DailyDropGear.vue';
import RegularGear from '../components/gear/RegularGear.vue';

const data = useDataStore();
onMounted(() => data.updateAll());
</script>
