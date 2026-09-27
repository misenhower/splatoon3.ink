<template>
  <RouterView />
</template>

<script setup>
import { onMounted, onUnmounted, watchEffect } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useDataStore } from './stores/data';
import { useTimeStore } from './stores/time.mjs';

const route = useRoute();
const { t } = useI18n();

watchEffect(() => {
  const title = route.meta.titleKey ? t(route.meta.titleKey) : route.meta.title;
  document.title = title ? `${title} — Splatoon3.ink` : 'Splatoon3.ink';
});

const time = useTimeStore();
onMounted(() => time.startUpdatingNow());
onUnmounted(() => time.stopUpdatingNow());

const data = useDataStore();
onMounted(() => data.startUpdating());
onUnmounted(() => data.stopUpdating());

// Detect mobile browsers
if (navigator.userAgent.match(/iPhone|iPad|Android/i)) {
  document.body.classList.add('is-mobile');
}
</script>

<style>
@import '@/assets/css/base.css';
</style>
