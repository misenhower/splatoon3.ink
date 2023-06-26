<template>
  <ScreenshotLayout header="Countdown">
    <div class="grow flex items-center justify-center">
      <div class="relative w-full max-w-2xl m-4 scale-[1.55]">
        <Splat3 class="absolute w-48 -bottom-16 left-28" fill="fill-splatoon-red" />
        <Splat2 class="absolute w-64 -top-20 -left-20" fill="fill-splatoon-orange" />
        <Splat4 class="absolute w-64 -top-20 -right-20" fill="fill-splatoon-blue" />
        <Splat1 class="absolute hidden sm:block w-48 -bottom-36 right-20" fill="fill-splatoon-green" />

        <div class="relative">
          <div class="font-splatoon1 text-6xl text-center">
            Splatoon 3
          </div>

          <Splatoon3Countdown />
        </div>
      </div>
    </div>
  </ScreenshotLayout>
</template>

<script setup>
import Splatoon3Countdown from '@/components/Splatoon3Countdown.vue'
import Splat2 from '@/components/splats/Splat2.vue';
import Splat3 from '@/components/splats/Splat3.vue';
import Splat4 from '@/components/splats/Splat4.vue';
import Splat1 from '@/components/splats/Splat1.vue';
import ScreenshotLayout from '../../layouts/ScreenshotLayout.vue';
</script>
