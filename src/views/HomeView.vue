<template>
  <main class="min-h-screen flex flex-col">
    <div class="grow flex items-center justify-center">
      <div class="w-full max-w-2xl m-4">
        <div class="font-splatoon1 text-5xl text-center">Splatoon 3</div>

        <Splatoon3Countdown />
      </div>
    </div>

    <div class="m-2 text-center text-sm text-slate-300">
      <a href="https://splatoon2.ink" target="_blank">
        splatoon2.ink
      </a>
      &ndash;
      <a href="https://twitter.com/splatoon2inkbot" target="_blank">
        @splatoon2inkbot
      </a>
    </div>
  </main>
</template>

<script setup>
import Splatoon3Countdown from '@/components/Splatoon3Countdown.vue'
</script>
