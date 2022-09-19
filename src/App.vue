<script setup>
import { RouterView } from 'vue-router';

try {
  // Detect mobile browsers
  if (navigator.userAgent.match(/iPhone|Android/i)) {
    document.body.classList.add('is-mobile');
  }
} catch (e) {
  //
}
</script>

<template>
  <RouterView />
</template>

<style>
@import '@/assets/css/base.css';
</style>
