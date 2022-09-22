<template>
  <RouterView />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { RouterView } from 'vue-router';
import { useDataStore } from '@/stores/data';
import { useTimeStore } from '@/stores/time.mjs';

const time = useTimeStore();
onMounted(() => time.startUpdatingNow());
onUnmounted(() => time.stopUpdatingNow());

const data = useDataStore();
onMounted(() => data.startUpdating());
onUnmounted(() => data.stopUpdating());

try {
  // Detect mobile browsers
  if (navigator.userAgent.match(/iPhone|iPad|Android/i)) {
    document.body.classList.add('is-mobile');
  }
} catch (e) {
  //
}
</script>

<style>
@import '@/assets/css/base.css';
</style>
