<template>
  <div class="flex justify-center text-xs">
    <div class="flex space-x-2 bg-zinc-700 p-1 rounded">
      <div class="bg-zinc-500 rounded font-semibold px-1">Time Offset</div>

      <div v-for="part of ['d', 'h', 'm']" :key="part">
        <select class="bg-zinc-800 text-right" v-model="values[part]">
          <option v-for="i of range(limits[part])" :key="i">
            {{ i }}
          </option>
        </select>
        {{ part.toUpperCase() }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watchEffect } from 'vue';
import { useTimeStore } from '../../stores/time.mjs';

const time = useTimeStore();

const limits = { d: 7, h: 23, m: 59 };
const values = reactive({ d: 0, h: 0, m: 0 });

function range(limit) {
  let result = [0];
  for (let i = 1; i <= limit; i++) {
    result.unshift(-i);
    result.push(i);
  }

  return result;
}

watchEffect(() => {
  let offset =
    values.d * 24 * 60 * 60 * 1000 +
    values.h * 60 * 60 * 1000 +
    values.m * 60 * 1000;

  time.setOffset(offset);
});
</script>
