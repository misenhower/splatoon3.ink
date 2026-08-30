<template>
  <main class="min-h-screen flex flex-col overflow-hidden">
    <slot />

    <div class="h-16" />

    <div class="h-12 m-4 bg-black/50 backdrop-blur-xs rounded-full absolute bottom-0 inset-x-0">
      <div class="flex justify-between h-full font-splatoon2 text-sm text-zinc-300">
        <div class="flex justify-start items-center space-x-6 ml-4">
          <div>
            <img src="@/assets/img/favicon.svg" class="h-16 -my-8" />
          </div>
          <div class="flex items-center space-x-8">
            <div class="text-3xl text-zinc-50">
              {{ props.header }}
            </div>
            <div>
              <img src="@/assets/img/bluesky-white.svg" width="15" height="15" class="inline" />
              @splatoon3.ink
            </div>
            <!-- <div>
              <img src="@/assets/img/fediverse-white.svg" width="14" height="14" class="inline m-[3px]" />
              @splatoon3ink@splatoon3.ink
            </div> -->
            <!-- <div>
              splatoon3.ink
            </div> -->
          </div>
        </div>
        <!-- <div class="flex justify-end items-center mr-6">
          {{ formatDateTime(time.now) }}
        </div> -->
      </div>
    </div>

    <div class="fixed bottom-0 right-4 z-50">
      <TimeOffsetSelector v-if="isDev" class="mb-4" />
    </div>
  </main>
</template>

<script setup>
import { nextTick, onUnmounted, watch, watchEffect } from 'vue';
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
    time.setNow(route.query.time);
  }
});

// function formatDateTime(date) {
//   date = new Date(date);

//   return date.toLocaleString(undefined, {
//     dateStyle: 'long',
//     timeStyle: 'short',
//   })
// }

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
