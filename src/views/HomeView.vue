<template>
  <MainLayout>
    <div class="grow flex items-center justify-center">
      <div class="relative w-full max-w-2xl m-4">
        <Splat3 class="absolute w-48 -bottom-16 left-32" fill="fill-splatoon-red" />
        <Splat2 class="absolute w-64 -top-20 -left-20" fill="fill-splatoon-yellow" />
        <Splat4 class="absolute w-64 -top-20 -right-20" fill="fill-splatoon-blue" />

        <div class="relative">
          <div class="font-splatoon1 text-5xl text-center">Splatoon 3</div>

          <Splatoon3Countdown />
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import MainLayout from '@/layouts/MainLayout.vue'
import Splatoon3Countdown from '@/components/Splatoon3Countdown.vue'
import Splat2 from '../components/splats/Splat2.vue';
import Splat3 from '../components/splats/Splat3.vue';
import Splat4 from '../components/splats/Splat4.vue';
</script>
