<template>
  <main class="min-h-screen flex flex-col overflow-hidden">
    <slot />

    <div class="m-2 text-center text-xs text-gray-500">
      <div>
        <img src="@/assets/img/little-buddy.png" class="mx-auto mb-4" width="50" />
      </div>
      <div>
        This website is not affiliated with Nintendo. All product names, logos, and brands are property of their
        respective owners.
      </div>
      <div class="footer-links">
        <router-link to="/faq">
          <span>FAQ</span>
        </router-link>
        &ndash;
        <a href="https://twitter.com/splatoon3ink" target="_blank">
          <img src="@/assets/img/twitter-white.png" width="20" height="20" class="inline" />
          <span>@splatoon3ink</span>
        </a>
        &ndash;
        <a href="https://splatoon2.ink" target="_blank">
          <span>splatoon2.ink</span>
        </a>
        &ndash;
        <a href="https://github.com/misenhower/splatoon3.ink" target="_blank">
          <span>GitHub</span>
        </a>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useTimeStore } from '../stores/time';

const time = useTimeStore();

onMounted(() => time.startUpdatingNow());
onUnmounted(() => time.stopUpdatingNow());
</script>

<style scoped>
.footer-links a span {
  @apply text-gray-300;
}

.footer-links a:hover span {
  @apply text-white underline;
}
</style>
