<template>
  <div class="relative">
    <div class="absolute inset-0 product-mask rounded-2xl -z-10" :class="props.bg"></div>
    <slot />
  </div>
</template>

<script setup>
const props = defineProps({
  bg: {
    type: String,
    default: 'bg-splatoon-blue',
  },
})
</script>

<style scoped>
.product-mask {
  mask-image: url('@/assets/img/tag-card-header.svg');
  mask-position: top;
  mask-size: 2000px auto;
  mask-repeat: no-repeat;
}
</style>
