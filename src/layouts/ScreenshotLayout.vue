<template>
  <main class="min-h-screen flex flex-col overflow-hidden">
    <slot />

    <div class="h-12 m-4 bg-black bg-opacity-50 rounded-full">
      <div class="flex justify-between h-full font-splatoon2 text-sm text-gray-300">
        <div class="flex justify-start items-center space-x-6 ml-4">
          <div>
            <img src="@/assets/img/favicon.svg" class="h-16 -my-8" />
          </div>
          <div class="flex items-center space-x-8">
            <div class="text-3xl text-gray-50">
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
import { onMounted, onUnmounted } from 'vue';
import { useDataStore } from '../stores/data';
import { useTimeStore } from '../stores/time';

const props = defineProps({
  header: {
    type: String,
  },
})

const time = useTimeStore();
const data = useDataStore();

onMounted(() => time.startUpdatingNow());
onMounted(() => data.updateAll());
onUnmounted(() => time.stopUpdatingNow());

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
  @apply text-gray-300;
}

.footer-links a:hover span {
  @apply text-white underline;
}
</style>
