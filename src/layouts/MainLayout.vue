<template>
  <main class="min-h-screen flex flex-col overflow-hidden">
    <div class="flex flex-col md:flex-row space-y-2 md:space-y-0 justify-between items-center mx-4 my-4 md:mx-12 z-50">
      <div class="font-splatoon1 text-5xl text-shadow-lg">
        <router-link to="/">Splatoon 3</router-link>
      </div>

      <div class="justify-end font-splatoon2 text-3xl text-gray-200" v-if="props.title">
        {{ props.title }}
      </div>
    </div>

    <div class="flex mx-4 md:mx-12 justify-center md:justify-end mb-4">
      <NavButtons />
    </div>

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
        <router-link to="/about">
          <span>About</span>
        </router-link>
        &ndash;
        <a href="https://github.com/misenhower/splatoon3.ink/wiki/Data-Access" target="_blank">
          <span>Data</span>
        </a>
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
import NavButtons from '../components/NavButtons.vue';

const props = defineProps({
  title: String,
});

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
