<template>
  <div class="relative">
    <div class="bg-zinc-700 aspect-[2/1] overflow-hidden" :class="imgClass">
      <img :src="lowRes" v-if="lowRes" />
      <div class="bg-zinc-500 animate-pulse h-full" :class="imgClass" v-else>&nbsp;</div>
    </div>

    <div class="
      absolute
      bg-zinc-900
      rounded
      bottom-0
      left-1/2
      -translate-x-1/2
      translate-y-1/2
      overflow-ellipsis
      overflow-hidden
      max-w-[85%]
      whitespace-nowrap
      font-splatoon2
      px-2
    " :class="textSize" v-if="!hideLabel">{{ $t('maps.' + stage?.name.replace("'", '')) }}</div>
  </div>
</template>

<script setup>
import { computed } from '@vue/reactivity';

const props = defineProps({
  stage: Object,
  imgClass: String,
  textSize: {
    type: String,
    default: 'text-xs lg:text-sm',
  },
  hideLabel: Boolean,
});

const lowRes = computed(() => props.stage?.image.url);
</script>
