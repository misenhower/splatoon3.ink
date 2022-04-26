<template>
  <div>
    <div class="mt-6 font-splatoon2" aria-hidden="true">
      <div class="font-splatoon2 text-center space-y-2">
        <div v-if="isReleased">
          <div class="text-gray-100 text-2xl">is out now!</div>
        </div>
        <div v-else>
          <div class="text-gray-300">releases in</div>
          <div class="text-gray-100 text-2xl">{{ days(remainingTime) }}!</div>
        </div>
      </div>
      <div class="bg-blue-pattern rounded-full overflow-hidden my-4">
        <div class="h-10 bg-yellow-pattern bg-animated rounded-full" :style="`width: ${percent}%`"></div>
      </div>
      <div class="flex justify-between text-sm font-medium">
        <div class="text-splatoon-yellow -rotate-3" :title="formatDate(announceDate)">
          Announced
        </div>
        <div class="text-right rotate-3" :class="isReleased ? 'text-splatoon-yellow' : 'text-splatoon-blue'" :title="formatDate(releaseDate)">
          Released
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';

const announceDate = new Date('2021-02-17');
const releaseDate = new Date('2022-09-09');
const now = ref(new Date);

let timer;

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date;
  }, 200);
})

onUnmounted(() => clearInterval(timer))

const totalTime = releaseDate - announceDate;
const remainingTime = computed(() => {
  let time = now.value.getTime();

  // Compare the time based on midnight local time
  time -= (new Date).getTimezoneOffset() * 60 * 1000;

  return releaseDate - time;
})
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
  })
}
</script>

<style scoped>
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
