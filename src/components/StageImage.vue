<template>
  <div class="relative">
    <div class="bg-gray-700 aspect-[2/1] overflow-hidden" :class="imgClass">
      <img :src="lowRes" v-if="lowRes" />
      <div class="bg-gray-500 animate-pulse h-full" :class="imgClass" v-else>&nbsp;</div>
    </div>

    <div class="
      absolute
      bg-gray-900
      bottom-0
      left-1/2
      -translate-x-1/2
      translate-y-1/2
      overflow-ellipsis
      overflow-hidden
      max-w-[85%]
      whitespace-nowrap
      font-splatoon2
      text-xs
      lg:text-sm
      px-2
      ss:text-3xl
    ">{{ stage?.name }}</div>
  </div>
</template>

<script setup>
import { computed } from '@vue/reactivity';

const props = defineProps({
  stage: Object,
  imgClass: String,
});

const lowRes = computed(() => props.stage?.image.url);
</script>
