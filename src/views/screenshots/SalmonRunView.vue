<template>
  <ScreenshotLayout header="Salmon Run">
    <div class="grow flex items-center justify-center">
      <div class="max-w-2xl scale-[1.6]">
        <SalmonRunBox class="-rotate-1" is-screenshot :start-time="route.query.startTime" :eggstra="route.query.eggstra=='true'" />
      </div>
    </div>
  </ScreenshotLayout>
</template>

<script setup>
import { useRoute } from 'vue-router';
import ScreenshotLayout from '../../layouts/ScreenshotLayout.vue';
import SalmonRunBox from '../../components/salmonrun/SalmonRunBox.vue';

const route = useRoute();
</script>
