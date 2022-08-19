<template>
  <div class="rounded-xl" :class="props.bg">
    <div class="p-4">
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
