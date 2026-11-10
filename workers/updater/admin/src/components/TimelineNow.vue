<template>
  <span class="pointer-events-none absolute z-10 -translate-x-1/2" :class="pill ? 'top-0' : 'top-12 bottom-0 w-0.5 bg-accent/70'" :style="{ left: `${left}px` }">
    <span v-if="pill" class="block rounded-full bg-accent px-2 py-px text-xs font-semibold whitespace-nowrap text-accent-ink">
      Now {{ clock.time(store.now, false) }}
    </span>
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { clock } from '../clock.js';
import { store } from '../store.js';

// The present on the timeline: a pill in the axis, or a line through the rows. It moves every
// second, so it is its own component and the rest of the timeline is left alone.
const props = defineProps({
  origin: { type: Number, required: true },
  scale: { type: Number, required: true },
  offset: { type: Number, default: 0 },
  pill: { type: Boolean, default: false },
});

const left = computed(() => props.offset + (store.now - props.origin) * props.scale);
</script>
