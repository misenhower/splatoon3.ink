<template>
  <main class="min-h-screen flex flex-col overflow-hidden">
    <slot />

    <div class="h-16" />

    <div class="h-12 m-4 bg-black/50 backdrop-blur-xs rounded-full absolute bottom-0 inset-x-0">
      <div class="flex justify-between h-full font-splatoon2 text-sm text-zinc-300">
        <div class="flex justify-start items-center space-x-4 ml-4 shrink-0">
          <div>
            <img src="@/assets/img/favicon.svg" class="h-16 -my-8" />
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-2xl text-zinc-50">
              {{ props.header }}
            </div>
            <div>
              <img src="@/assets/img/bluesky-white.svg" width="15" height="15" class="inline" />
              @splatoon3.ink
            </div>
          </div>
        </div>
        <div class="flex items-center gap-5 mx-5 whitespace-nowrap">
          <div class="text-zinc-100">
            {{ timestamps[0] }}
          </div>
          <div class="grid grid-flow-col grid-rows-2 gap-x-4 text-xs leading-5 text-right">
            <div v-for="timestamp in timestamps.slice(1)" :key="timestamp">
              {{ timestamp }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="fixed bottom-20 right-4 z-50">
      <TimeOffsetSelector v-if="isDev" class="mb-4" />
    </div>
  </main>
</template>

<script setup>
import { computed, nextTick, onUnmounted, watch, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { markScreenshotReady, screenshotReadyAttribute } from '@/common/screenshot.mjs';
import { useDataStore } from '@/stores/data';
import { useTimeStore } from '@/stores/time';
import TimeOffsetSelector from '@/components/Debug/TimeOffsetSelector.vue';

const props = defineProps({
  header: {
    type: String,
  },
});

const route = useRoute();
const data = useDataStore();
const time = useTimeStore();
let readinessVersion = 0;

watch(
  [() => data.isLoaded, () => data.isUpdating, () => route.fullPath],
  async ([isLoaded, isUpdating]) => {
    let version = ++readinessVersion;
    document.documentElement.removeAttribute(screenshotReadyAttribute);

    if (!isLoaded || isUpdating) return;

    await nextTick();
    await markScreenshotReady({ isCurrent: () => version === readinessVersion });
  },
  { immediate: true, flush: 'post' },
);

onUnmounted(() => {
  readinessVersion++;
  document.documentElement.removeAttribute(screenshotReadyAttribute);
});

watchEffect(() => {
  if (route.query.time) {
    time.stopUpdatingNow();
    time.setNow(Number(route.query.time));
  }
});

const timestampFormats = [
  { locale: 'en-GB', timeZone: 'UTC', hour12: false, month: 'long' },
  { locale: 'en-US', timeZone: 'America/Los_Angeles', hour12: true },
  { locale: 'en-US', timeZone: 'America/New_York', hour12: true },
  { locale: 'en-GB', timeZone: 'Europe/London', hour12: false },
  { locale: 'ja-JP', timeZone: 'Asia/Tokyo', hour12: false },
].map(({ locale, ...options }) => new Intl.DateTimeFormat(locale, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
  ...options,
}));

const timestamps = computed(() => {
  const date = new Date(time.now);

  return timestampFormats.map(format => format.format(date).replace(/\s+at\s+/u, ' '));
});

const isDev = import.meta.env.DEV;
</script>

<style scoped>
@reference "@/assets/css/base.css";

.footer-links a span {
  @apply text-zinc-300;
}

.footer-links a:hover span {
  @apply text-white underline;
}
</style>
