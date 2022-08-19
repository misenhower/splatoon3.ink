<template>
  <MainLayout>
    <div class="grow flex items-center justify-center">
      <div class="w-full max-w-2xl m-4">
        <div class="font-splatoon1 text-5xl text-center">Splatoon 3</div>

        <Splatoon3Countdown />
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import MainLayout from '@/layouts/MainLayout.vue'
import Splatoon3Countdown from '@/components/Splatoon3Countdown.vue'
</script>
