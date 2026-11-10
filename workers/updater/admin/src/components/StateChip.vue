<template>
  <span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap" :class="classes[state] ?? classes.off">
    <span v-if="state === 'running'" class="size-1.5 animate-pulse rounded-full bg-busy" aria-hidden="true" />
    <slot>{{ labels[state] ?? state }}</slot>
  </span>
</template>

<script setup>
defineProps({
  state: { type: String, required: true },
});

const classes = {
  ok: 'border-ok/60 text-ok',
  scheduled: 'border-ok/60 text-ok',
  failed: 'border-bad/70 text-bad',
  incomplete: 'border-warn/70 text-warn',
  partial: 'border-warn/70 text-warn',
  upcoming: 'border-line text-muted',
  paused: 'border-warn/70 text-warn',
  running: 'border-busy/70 text-busy',
  queued: 'border-busy/70 text-busy',
  off: 'border-line text-muted',
};

const labels = {
  ok: 'OK',
  failed: 'Failed',
  incomplete: 'Unfinished',
  partial: 'Partly failed',
  upcoming: 'Upcoming',
  running: 'Running',
  queued: 'Queued',
  scheduled: 'Scheduled',
  paused: 'Paused',
  off: 'Off',
};
</script>
