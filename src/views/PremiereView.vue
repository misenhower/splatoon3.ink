<template>
  <MainLayout>
    <div class="grow flex items-center justify-center">
      <div class="w-full max-w-2xl mt-36 mb-20 mx-4">
        <div class="relative">
          <Splat2 class="absolute -top-32 -left-24 w-64" />
          <Splat5 class="absolute -right-28 -bottom-24 w-64" />

          <ProductContainer class="relative md:rotate-1">
            <div>
              <div class="text-gray-300 px-6 py-8">
                <div class="text-3xl font-splatoon1 text-white mb-4">
                  Splatfest World Premiere
                </div>

                <div class="mb-4">All times shown in your local timezone.</div>

                <div class="space-y-6">
                  <div v-for="date in dates" :key="date.name" class="font-splatoon2">
                    <h1 class="text-2xl text-gray-100">{{ date.name }}</h1>

                    <div class="text-lg text-gray-50">
                      {{ formatDate(date.start) }}
                      &ndash;
                      {{ formatTime(date.end) }}
                    </div>

                    <div v-if="isPast(date.end)">
                      Splatfest is now closed!
                    </div>
                    <div v-else-if="isPast(date.start)">
                      Splatfest ends in {{ duration(date.end) }}
                    </div>
                    <div v-else>
                      Splatfest starts in {{ duration(date.start) }}
                    </div>
                  </div>

                  <div class="font-splatoon2">
                    <div class="text-3xl font-splatoon1 text-white">Results</div>
                    <div v-if="isPast(results)">
                      Results are now available in game!
                    </div>
                    <div v-else>
                      Results will be available in-game
                      at {{ formatTime(results) }}
                      (in {{ duration(results) }})
                    </div>
                  </div>
                </div>

                <img class="absolute -top-10 right-10 w-48 -rotate-3" src="@/assets/img/tape/tape-1.png" />
                <img class="absolute -bottom-14 left-4 w-44 rotate-6" src="@/assets/img/tape/tape-3.png" />
                <img class="absolute top-20 -right-28 w-32 rotate-6" src="@/assets/img/stickers/sticker-4.png" />
                <img class="absolute -bottom-10 right-32 w-44 -rotate-3" src="@/assets/img/stickers/sticker-10.png" />

              </div>
            </div>
          </ProductContainer>

        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import MainLayout from '@/layouts/MainLayout.vue'
import ProductContainer from '@/components/ProductContainer.vue'
import Splat2 from '../components/splats/Splat2.vue';
import Splat5 from '../components/splats/Splat5.vue';
import { onMounted, onUnmounted } from 'vue';
import { useTimeStore } from '../stores/time';

const time = useTimeStore();

onMounted(() => time.startUpdatingNow());
onUnmounted(() => time.stopUpdatingNow());

const dates = [
  {
    name: 'Europe',
    start: new Date('27 Aug 2022 08:00:00 +0000'),
    end: new Date('27 Aug 2022 20:00:00 +0000'),
  },
  {
    name: 'The Americas',
    start: new Date('27 Aug 2022 16:00:00 +0000'),
    end: new Date('28 Aug 2022 04:00:00 +0000'),
  },
  {
    name: 'Japan/Australia/New Zealand/Hong Kong/S. Korea',
    start: new Date('28 Aug 2022 00:00:00 +0000'),
    end: new Date('28 Aug 2022 12:00:00 +0000'),
  },
];

const results = new Date('28 Aug 2022 14:00:00 +0000');

function isPast(date) {
  return time.now >= date;
}

function getDurationParts(value) {
  value = Math.round(value / 1000);

  let negative = (value < 0) ? '-' : '';
  value = Math.abs(value);

  let days = Math.floor(value / 86400);
  value -= days * 86400;
  let hours = Math.floor(value / 3600) % 24;
  value -= hours * 3600;
  let minutes = Math.floor(value / 60) % 60;
  value -= minutes * 60;
  let seconds = value % 60;

  return { negative, days, hours, minutes, seconds };
}

function duration(value) {
  value = value - time.now;
  let { days, hours, minutes, seconds } = getDurationParts(value);

  hours += days * 24;

  if (hours) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function formatDate(date) {
  return date.toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  })
}

function formatTime(date) {
  return date.toLocaleTimeString(undefined, {
    timeStyle: 'short',
  })
}

</script>
