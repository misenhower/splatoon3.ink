<template>
  <ScreenshotLayout header="Salmon Run Gear">
    <div class="grow flex justify-center items-center mt-4">
      <div>
        <SalmonRunGearBox class="-rotate-1 scale-[1.3]" />
      </div>
    </div>
  </ScreenshotLayout>
</template>

<script setup>
import ScreenshotLayout from '../../layouts/ScreenshotLayout.vue';
import SalmonRunGearBox from '../../components/SalmonRunGearBox.vue';
</script>
