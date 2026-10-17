<template>
  <ScreenshotLayout :header="$t('screenshots.headers.gear')">
    <div class="flex justify-center mt-4">
      <RegularGear class="-rotate-1" />
    </div>
  </ScreenshotLayout>
</template>

<script setup>
import ScreenshotLayout from '@/layouts/ScreenshotLayout.vue';
import RegularGear from '@/components/screenshots/RegularGear.vue';
</script>
