<template>
  <main class="min-h-screen flex flex-col overflow-hidden">
    <slot />

    <div class="h-16"></div>

    <div class="h-12 m-4 bg-black bg-opacity-50 backdrop-blur-sm rounded-full absolute bottom-0 inset-x-0">
      <div class="flex justify-between h-full font-splatoon2 text-sm text-zinc-300">
        <div class="flex justify-start items-center space-x-6 ml-4">
          <div>
            <img src="@/assets/img/favicon.svg" class="h-16 -my-8" />
          </div>
          <div class="flex items-center space-x-8">
            <div class="text-3xl text-zinc-50">
              {{ header }}
            </div>
            <div>
              <img src="@/assets/img/twitter-white.png" width="20" height="20" class="inline" />
              @splatoon3ink
            </div>
            <div>
              splatoon3.ink
            </div>
          </div>
        </div>
        <!-- <div class="flex justify-end items-center mr-6">
          {{ formatDateTime(time.now) }}
        </div> -->
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { useDataStore } from '../stores/data';
import { useTimeStore } from '../stores/time';

const props = defineProps({
  header: {
    type: String,
  },
})

const route = useRoute();

const time = useTimeStore();
const data = useDataStore();

onMounted(() => data.updateAll());

watchEffect(() => {
  if (route.query.time) {
    time.setNow(route.query.time);
  }
});

function formatDateTime(date) {
  date = new Date(date);

  return date.toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  })
}
</script>

<style scoped>
.footer-links a span {
  @apply text-zinc-300;
}

.footer-links a:hover span {
  @apply text-white underline;
}
</style>
