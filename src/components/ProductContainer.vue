<template>
  <div>
    <div :class="props.bg" class="rounded-t-2xl h-12 -mb-1 header-mask">

    </div>
    <div :class="props.bg" class="rounded-b-2xl pb-10">
      <slot />
    </div>
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
.header-mask {
  mask-image: url('@/assets/img/tag-card-header.svg');
  mask-position: top;
  mask-size: auto 60px;
  mask-repeat: no-repeat;
}
</style>
