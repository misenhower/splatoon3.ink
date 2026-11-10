<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="card-title">
        {{ LANE_LABELS[run.lane] }} <span class="text-muted">·</span> <span class="font-mono">{{ clock.when(run.startedAt) }}</span>
      </h2>
      <StateChip :state="run.state" />
    </div>

    <dl class="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-3">
      <div>
        <dt class="label">
          Trigger
        </dt>
        <dd class="mt-0.5">
          {{ TRIGGER_LABELS[run.trigger] ?? run.trigger }}
        </dd>
      </div>
      <div>
        <dt class="label">
          Mode
        </dt>
        <dd class="mt-0.5 font-mono">
          {{ run.mode }}
        </dd>
      </div>
      <div>
        <dt class="label">
          Duration
        </dt>
        <dd class="mt-0.5 font-mono">
          {{ formatDuration(run.durationMs) }}{{ run.running ? ' so far' : '' }}
        </dd>
      </div>
      <div v-if="run.driftMs != null">
        <dt class="label">
          Started late by
        </dt>
        <dd class="mt-0.5 font-mono">
          {{ formatDuration(run.driftMs) }}
        </dd>
      </div>
      <div v-if="run.lane === 'fast'">
        <dt class="label">
          Social posts
        </dt>
        <dd class="mt-0.5">
          {{ !run.social ? 'Skipped' : run.postCount ? `${run.postCount} sent or failed` : run.running ? 'After the data' : 'Nothing was due' }}
        </dd>
      </div>
    </dl>

    <p v-if="run.error" class="rounded-lg border border-bad/50 bg-bad/10 px-3 py-2 text-bad">
      {{ run.error }}
    </p>
    <p v-if="run.incomplete" class="rounded-lg border border-warn/50 bg-warn/10 px-3 py-2 text-warn">
      Stopped at its time budget with work left. A follow-up run continues it.
    </p>

    <div v-if="run.results.length" class="flex flex-col border-t border-line">
      <div
        v-for="result in run.results"
        :key="result.name"
        class="flex items-baseline justify-between gap-3 border-b border-raised py-2"
      >
        <span class="font-mono">{{ result.name }}</span>
        <span v-if="!result.ok" class="text-right text-bad">{{ result.error }}</span>
        <span v-else-if="result.skipped" class="text-warn">Skipped, out of time</span>
        <span v-else class="font-mono text-muted">{{ result.ms == null ? 'OK' : formatDuration(result.ms) }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-baseline justify-between gap-3">
        <h3 class="label">
          Log
        </h3>
        <span v-if="logs?.omitted" class="text-xs text-muted">{{ logs.omitted }} later lines not kept</span>
      </div>
      <LogLines v-if="logs?.lines.length" :lines="logs.lines" class="max-h-72" />
      <p v-else class="text-muted">
        {{ logError ?? (logs ? 'This run printed nothing.' : 'Loading…') }}
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="btn"
        :disabled="!!store.busy || lanePaused"
        @click="rerun"
      >
        Run {{ run.mode }} again, data only
      </button>
      <button type="button" class="btn" @click="copyLink">
        {{ copied ? 'Link copied' : 'Copy link' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { api } from '../api.js';
import { clock } from '../clock.js';
import { formatDuration, LANE_LABELS, TRIGGER_LABELS } from '../lib/format.js';
import { act, store } from '../store.js';
import LogLines from './LogLines.vue';
import StateChip from './StateChip.vue';

// One lane run: how it went, what each updater did, and what it printed.
const props = defineProps({
  run: { type: Object, required: true },
});

const key = computed(() => `${props.run.lane}:${props.run.id}`);

// Finished runs never change, so their log lines are fetched once.
const cache = new Map();

const logs = ref(null);
const logError = ref(null);
const copied = ref(false);

const lanePaused = computed(() => !!store.status?.lanes[props.run.lane]?.paused);

async function load() {
  let run = props.run;
  let wanted = key.value;

  if (cache.has(wanted)) {
    logs.value = cache.get(wanted);

    return;
  }

  try {
    let { run: full } = await api.run(run.lane, run.id, run.running ? null : run.startedAt);

    if (key.value !== wanted) return;

    logs.value = full.logs ?? { lines: [], omitted: 0 };
    logError.value = null;

    if (!run.running) {
      cache.set(wanted, logs.value);
    }
  } catch (error) {
    if (key.value === wanted && !run.running) {
      logError.value = error.message;
    }
  }
}

watch(key, () => {
  logs.value = null;
  logError.value = null;
  load();
}, { immediate: true });

// Follow a run in progress as new lines arrive.
watch(() => store.loadedAt, () => props.run.running && load());

function rerun() {
  let { lane, mode } = props.run;

  act(`run:${lane}`, '/run', { lane, mode, social: false }, `Queued a ${mode} run on the ${lane} lane, data only.`);
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(location.href);
    copied.value = true;
    setTimeout(() => copied.value = false, 2000);
  } catch {
    // The address bar already has the link.
  }
}
</script>
