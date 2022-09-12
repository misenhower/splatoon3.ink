<template>
  <div class="relative">
    <img :src="lowRes" :class="imgClass" />

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
    ">{{ stage.name }}</div>
  </div>
</template>

<script setup>
import { computed } from '@vue/reactivity';

const props = defineProps({
  stage: {
    required: true,
  },
  imgClass: String,
});

const lowRes = computed(() => props.stage.image.url);
</script>
