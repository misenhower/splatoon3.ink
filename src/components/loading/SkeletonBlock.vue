<template>
  <div class="skeleton-block" aria-hidden="true" />
</template>

<style scoped>
@reference "@/assets/css/base.css";

@layer components {
  .skeleton-block {
    @apply rounded-md bg-white/20 motion-safe:animate-pulse;
  }
}
</style>
