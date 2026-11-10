<template>
  <section class="card flex flex-col gap-3" aria-label="Runs">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="card-title">
        Runs
      </h2>
      <span class="text-muted">{{ visible.length }} of {{ runs.length }}</span>
    </div>

    <div class="segmented self-start" role="group" aria-label="Filter runs">
      <button
        v-for="option in filters"
        :key="option.key"
        type="button"
        :aria-pressed="filter === option.key"
        @click="filter = option.key"
      >
        {{ option.label }}
      </button>
    </div>

    <div
      ref="list"
      class="relative -mx-2 flex max-h-[32rem] flex-col overflow-y-auto"
      @keydown.down.prevent="step(1)"
      @keydown.up.prevent="step(-1)"
    >
      <button
        v-for="run in visible"
        :key="run.key"
        type="button"
        class="grid min-h-12 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg px-2 py-1 text-left transition-colors"
        :class="run.key === selectedKey ? 'bg-line' : 'hover:bg-raised'"
        :aria-pressed="run.key === selectedKey"
        :data-key="run.key"
        @click="emit('select', run.key)"
      >
        <span class="font-mono">{{ clock.when(run.startedAt) }}</span>
        <span class="flex min-w-0 flex-col">
          <span class="font-semibold">{{ LANE_LABELS[run.lane] }}</span>
          <span class="truncate text-[13px] text-muted">
            {{ TRIGGER_LABELS[run.trigger] ?? run.trigger }} · {{ run.mode }} · {{ formatDuration(run.durationMs) }}
          </span>
        </span>
        <span class="font-semibold" :class="tones[run.state]">{{ STATE_LABELS[run.state] }}</span>
      </button>

      <p v-if="!visible.length" class="px-2 py-6 text-center text-muted">
        {{ runs.length ? 'No runs match this filter.' : 'No runs recorded yet.' }}
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { clock } from '../clock.js';
import { formatDuration, LANE_LABELS, STATE_LABELS, TRIGGER_LABELS } from '../lib/format.js';

const props = defineProps({
  runs: { type: Array, required: true },
  selectedKey: { type: String, default: null },
});

const emit = defineEmits(['select']);

const filters = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'fast', label: 'Fast', test: run => run.lane === 'fast' },
  { key: 'slow', label: 'Slow', test: run => run.lane === 'slow' },
  { key: 'failed', label: 'Failed', test: run => run.state === 'failed' || run.state === 'incomplete' },
  { key: 'manual', label: 'Manual', test: run => run.trigger === 'manual' },
];

const tones = { ok: 'text-ok', failed: 'text-bad', incomplete: 'text-warn', running: 'text-busy' };

const filter = ref('all');
const list = ref(null);
const visible = computed(() => props.runs.filter(filters.find(option => option.key === filter.value).test));

// Keep the selected run in view when it is chosen elsewhere (the timeline, the log), moving
// only this list and never the page.
watch(() => props.selectedKey, async key => {
  await nextTick();

  let container = list.value;
  let button = [...container?.querySelectorAll('button') ?? []].find(element => element.dataset.key === key);

  if (!button) return;

  if (button.offsetTop < container.scrollTop) {
    container.scrollTop = button.offsetTop;
  } else if (button.offsetTop + button.offsetHeight > container.scrollTop + container.clientHeight) {
    container.scrollTop = button.offsetTop + button.offsetHeight - container.clientHeight;
  }
}, { immediate: true });

// Arrow keys move the selection through the list.
async function step(direction) {
  let index = visible.value.findIndex(run => run.key === props.selectedKey);
  let next = visible.value[Math.min(Math.max(index + direction, 0), visible.value.length - 1)];

  if (!next) return;

  emit('select', next.key);
  await nextTick();

  let button = [...list.value.querySelectorAll('button')].find(element => element.dataset.key === next.key);

  button?.focus({ preventScroll: true });
}
</script>
