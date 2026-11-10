<template>
  <section class="card flex flex-col gap-3" aria-label="Log">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="card-title">
        Log
      </h2>
      <div class="flex flex-wrap items-center gap-2">
        <label class="sr-only" for="log-search">Search the log</label>
        <input
          id="log-search"
          v-model.trim="search"
          type="search"
          class="field w-44"
          placeholder="Search"
        />
        <div class="segmented" role="group" aria-label="Filter the log">
          <button
            v-for="option in sources"
            :key="option.key"
            type="button"
            :aria-pressed="source === option.key"
            @click="source = option.key"
          >
            {{ option.label }}
          </button>
        </div>
        <label class="flex min-h-9 items-center gap-2">
          <input v-model="problemsOnly" type="checkbox" class="size-4 accent-accent" />
          Problems only
        </label>
      </div>
    </div>

    <LogLines
      v-if="lines.length"
      :lines="lines"
      :selected-key="selectedKey"
      show-source
      class="max-h-[30rem]"
      @select="key => emit('select', key)"
    />
    <p v-else class="py-6 text-center text-muted">
      {{ store.logError ?? (store.log.length ? 'No lines match.' : 'Nothing logged yet.') }}
    </p>

    <p class="text-muted">
      Newest first, {{ clock.zone() }} time. Select a line to open what printed it.
    </p>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { clock } from '../clock.js';
import { store } from '../store.js';
import LogLines from './LogLines.vue';

defineProps({
  selectedKey: { type: String, default: null },
});

const emit = defineEmits(['select']);

const sources = [
  { key: 'all', label: 'All' },
  { key: 'fast', label: 'Fast' },
  { key: 'slow', label: 'Slow' },
  { key: 'auth', label: 'Auth' },
];

// What printed a line: a lane run, or a region's credential renewal.
function itemKey(line) {
  if (line.source === 'auth') return line.eventAt ? `auth:${line.region}:${line.eventAt}` : null;

  return line.runId ? `run:${line.source}:${line.runId}` : null;
}

const source = ref('all');
const problemsOnly = ref(false);
const search = ref('');

const lines = computed(() => {
  let needle = search.value.toLowerCase();

  return store.log
    .filter(line => source.value === 'all' || line.source === source.value)
    .filter(line => !problemsOnly.value || line.level === 'error' || line.level === 'warn')
    .filter(line => !needle || line.text.toLowerCase().includes(needle))
    .map(line => ({ ...line, itemKey: itemKey(line) }));
});
</script>
