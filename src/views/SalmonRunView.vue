<template>
  <MainLayout title="salmonrun">
    <div class="grow flex items-center justify-center">
      <div class="mx-4 md:mx-12 w-full">
        <div class="flex items-center justify-center flex-col lg:flex-row lg:items-start space-y-10 lg:space-y-0 lg:space-x-16">
          <div class="w-full max-w-2xl">
            <SalmonRunBox class="md:-rotate-1" />
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import MainLayout from '@/layouts/MainLayout.vue'
import SalmonRunBox from '../components/salmonrun/SalmonRunBox.vue';
</script>
