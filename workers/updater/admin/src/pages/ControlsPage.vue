<template>
  <div class="flex flex-col gap-4">
    <div>
      <h1 class="text-lg font-semibold">
        Controls
      </h1>
      <p class="mt-0.5 text-muted">
        Start a run, pause a lane, turn its schedule on or off, renew Nintendo credentials, and
        compress the archive. What happens shows up on the timeline.
      </p>
    </div>

    <div class="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <LaneCard
        v-for="(state, lane) in store.status.lanes"
        :key="lane"
        :lane="lane"
        :state="state"
        :schedule="store.status.schedules[lane]"
      />
      <AuthCard :regions="store.status.auth" class="lg:col-span-2 xl:col-span-1" />
      <ArchiveCard v-if="store.status.archive" :archive="store.status.archive" />
    </div>
  </div>
</template>

<script setup>
import ArchiveCard from '../components/ArchiveCard.vue';
import AuthCard from '../components/AuthCard.vue';
import LaneCard from '../components/LaneCard.vue';
import { store } from '../store.js';
</script>
