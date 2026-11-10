<template>
  <div v-if="!view.live" class="pointer-events-none absolute inset-y-0 z-40 w-px bg-ink/60" aria-hidden="true">
    <span v-if="!nearNow" class="absolute top-0 left-0 -translate-x-1/2 rounded-full bg-ink px-2 py-px font-mono text-xs font-semibold whitespace-nowrap text-ground">
      {{ clock.when(view.cursor, false) }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { clock } from '../clock.js';
import { store } from '../store.js';
import { view } from '../view.js';

// The moment the activity list is lined up with, once the timeline is scrolled away from now.
const props = defineProps({
  // Pixels per millisecond on the timeline.
  scale: { type: Number, required: true },
});

// This close to the present, its label would sit on top of the "now" pill.
const nearNow = computed(() => Math.abs(view.cursor - store.now) * props.scale < 70);
</script>
