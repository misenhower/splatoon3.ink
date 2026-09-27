<template>
  <div class="flex flex-wrap justify-center items-center gap-2 text-xs">
    <TimeOffsetSelector />

    <label class="flex items-center gap-2 bg-zinc-700 p-1 rounded-sm">
      <span class="bg-zinc-500 rounded-sm font-semibold px-1">Page state</span>
      <select v-model="preview.mode" class="bg-zinc-800">
        <option value="live">Live data</option>
        <option value="loading">Loading</option>
        <option value="empty">Empty</option>
        <option value="error">Error</option>
      </select>
    </label>
  </div>
</template>

<script setup>
import TimeOffsetSelector from './TimeOffsetSelector.vue';
import { usePagePreviewStore } from '@/stores/pagePreview.mjs';

const preview = usePagePreviewStore();
</script>
