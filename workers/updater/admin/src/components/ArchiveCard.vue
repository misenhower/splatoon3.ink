<template>
  <section class="card flex flex-col gap-3" aria-label="Archive">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="card-title">
        Archive
      </h2>
      <StateChip v-if="state" :state="state" />
    </div>

    <p class="text-muted">
      Compresses each finished day of data snapshots into one file, once a day.
    </p>

    <p v-if="archive.error" class="rounded-lg border border-bad/50 bg-bad/10 px-3 py-2 text-bad">
      Could not reach the compressor: {{ archive.error }}
    </p>

    <dl class="grid grid-cols-2 gap-3">
      <div>
        <dt class="label">
          Last run
        </dt>
        <dd class="mt-0.5">
          <RouterLink
            v-if="latest"
            :to="{ name: 'timeline', query: { item: `archive:${latest.id}` } }"
            class="underline decoration-muted underline-offset-2 hover:decoration-ink"
          >
            {{ archive.current ? 'Running now' : formatRelative(latest.startedAt, store.now) }}
          </RouterLink>
          <span v-else class="text-muted">None yet</span>
        </dd>
      </div>
      <div>
        <dt class="label">
          Next run
        </dt>
        <dd class="mt-0.5">
          <span v-if="archive.enabled === false" class="text-muted">Off</span>
          <template v-else-if="archive.nextAt">
            <span class="font-mono">{{ clock.time(archive.nextAt, false) }}</span>
            <span class="text-muted"> · {{ formatRelative(archive.nextAt, store.now) }}</span>
          </template>
          <span v-else class="text-muted">Unknown</span>
        </dd>
      </div>
    </dl>

    <p v-if="latest && !latest.ok && !archive.current" class="text-bad">
      {{ latest.error ?? 'The last run failed.' }}
    </p>
    <p v-if="archive.enabled === false" class="text-warn">
      The daily run is off. Compress now still works.
    </p>

    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="btn"
        :disabled="!!store.busy || !!archive.current"
        @click="compress(false)"
      >
        {{ store.busy === 'archive' ? 'Starting…' : 'Compress now' }}
      </button>
      <button
        type="button"
        class="btn"
        :disabled="!!store.busy || !!archive.current"
        @click="compress(true)"
      >
        Dry run
      </button>
      <ConfirmButton
        :confirm-label="archive.enabled ? 'Stop the daily run?' : 'Start the daily run?'"
        :disabled="!!store.busy || !!archive.error"
        @confirmed="setScheduling(!archive.enabled)"
      >
        Turn daily run {{ archive.enabled ? 'off' : 'on' }}
      </ConfirmButton>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { clock } from '../clock.js';
import { formatRelative } from '../lib/format.js';
import { act, store } from '../store.js';
import ConfirmButton from './ConfirmButton.vue';
import StateChip from './StateChip.vue';

const props = defineProps({
  // The status document's archive part: { enabled, nextAt, current, runs, error? }.
  archive: { type: Object, required: true },
});

const latest = computed(() => props.archive.current ?? props.archive.runs[0] ?? null);

const state = computed(() => {
  if (props.archive.current) return 'running';
  if (!latest.value) return null;

  return latest.value.ok ? 'ok' : 'failed';
});

function setScheduling(enabled) {
  act('archive:scheduling', '/archive/scheduling', { enabled }, `The daily archive compression turned ${enabled ? 'on' : 'off'}.`);
}

function compress(dryRun) {
  act('archive', '/archive/run', { dryRun }, dryRun ? 'Started a dry run of the compressor.' : 'Started compressing the archive.');
}
</script>
