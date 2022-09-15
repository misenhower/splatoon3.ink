<template>
  <div class="product-mask rounded-2xl" :class="props.bg">
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
