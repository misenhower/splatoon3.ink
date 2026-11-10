<template>
  <span class="text-xs font-semibold whitespace-nowrap text-accent">Now <span class="font-mono">{{ clock.time(store.now) }}</span></span>
</template>

<script setup>
import { clock } from '../clock.js';
import { store } from '../store.js';

// The clock on the activity list's "now" line. It ticks every second, so it is its own
// component and the rows around it are left alone.
</script>
