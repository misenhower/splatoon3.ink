<template>
  <div class="inline-block text-center px-2 py-1" :class="bg">
    <div class="relative">
      <div class="absolute squid-tl top-0 left-0" :class="squidBg" :style="squidStyles"></div>
      <div class="absolute squid-br bottom-0 right-0" :class="squidBg" :style="squidStyles"></div>
      <div class="label border" :class="props.border" :style="labelStyles">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from '@vue/reactivity';

const props = defineProps({
  bg: {
    default: 'bg-splatoon-blue',
  },
  squidBg: {
    default: 'bg-white',
  },
  border: {
    default: 'border-white',
  },
  squidSize: {
    default: '10px',
  },
});

const squidStyles = computed(() => [
  `width: ${props.squidSize}`,
  `height: ${props.squidSize}`,
]);

const labelStyles = computed(() => [
  `--squid-size: ${props.squidSize}`,
  `padding-left: ${props.squidSize}`,
  `padding-right: ${props.squidSize}`,
]);
</script>

<style scoped>
.squid-tl {
  mask-image: url('@/assets/img/squid-tape/tl.svg');
  mask-repeat: no-repeat;
  mask-size: contain;
}

.squid-br {
  mask-image: url('@/assets/img/squid-tape/br.svg');
  mask-repeat: no-repeat;
  mask-size: contain;
}

.label {
  clip-path: polygon(
    -5px var(--squid-size),
    var(--squid-size) var(--squid-size),
    var(--squid-size) -5px,
    100% -5px,
    100% calc(100% - var(--squid-size)),
    calc(100% - var(--squid-size)) calc(100% - var(--squid-size)),
    calc(100% - var(--squid-size)) calc(100% + var(--squid-size)),
    0 calc(100% + var(--squid-size))
  );
}
</style>
