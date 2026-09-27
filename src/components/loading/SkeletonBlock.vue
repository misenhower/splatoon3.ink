<template>
  <div class="skeleton-block" />
</template>

<style scoped>
@reference "@/assets/css/base.css";

@layer components {
  .skeleton-block {
    @apply rounded-md bg-white/20 motion-safe:animate-pulse;
  }
}
</style>
