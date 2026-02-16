<template>
  <div>
    <div class="mt-6 font-splatoon2" aria-hidden="true">
      <div class="font-splatoon2 text-center space-y-2">
        <div v-if="isReleased">
          <div class="text-zinc-100 text-2xl ss:text-5xl">
            is out now!
          </div>
        </div>
        <div v-else>
          <div class="text-zinc-300 ss:text-3xl ss:mb-2">
            releases in
          </div>
          <div class="text-zinc-100 text-2xl ss:text-5xl">
            {{ days(remainingTime) }}!
          </div>
        </div>
      </div>
      <div class="bg-blue-pattern rounded-full overflow-hidden my-4">
        <div class="h-10 bg-yellow-pattern bg-animated rounded-full" :style="`width: ${percent}%`" />
      </div>
      <div class="flex justify-between text-sm font-medium">
        <div class="text-splatoon-yellow ss:text-3xl -rotate-3" :title="formatDate(announceDate)">
          Announced
        </div>
        <div class="text-right ss:text-3xl rotate-3" :class="isReleased ? 'text-splatoon-yellow' : 'text-splatoon-blue'" :title="formatDate(releaseDate)">
          Released
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useTimeStore } from '@/stores/time';

const announceDate = new Date('2021-02-17');
const releaseDate = new Date('2022-09-09');
const time = useTimeStore();

const totalTime = releaseDate - announceDate;
const remainingTime = computed(() => {
  // Adjust the time based on midnight local time
  let adjustment = (new Date).getTimezoneOffset() * 60 * 1000;

  return releaseDate - time.now + adjustment;
});
const completedTime = computed(() => totalTime - remainingTime.value);
const percent = computed(() => Math.min(100, 100 * completedTime.value / totalTime));
const isReleased = computed(() => remainingTime.value <= 0);

function days(ms) {
  let days = Math.max(0, Math.ceil(ms / 1000 / 60 / 60 / 24));

  return days === 1
    ? '1 day'
    : `${days} days`;
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    timeZone: 'UTC',
    dateStyle: 'long',
  });
}
</script>

<style scoped>
@reference "@/assets/css/base.css";

.bg-blue-pattern {
  @apply bg-splatoon-blue;
  background-image: url("@/assets/img/battle-bg-pattern-blue.jpg");
  background-size: 190px;
}

.bg-yellow-pattern {
  @apply bg-splatoon-yellow;
  background-image: url("@/assets/img/battle-bg-pattern-yellow.jpg");
  background-size: 190px;
}

.bg-animated {
  animation-name: bg-keyframes;
  animation-duration: 30s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes bg-keyframes {
   from { background-position: 0; }
   to { background-position: 190px; }
}
</style>
