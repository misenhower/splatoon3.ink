<template>
  <section class="card flex flex-col gap-4" :aria-label="LANE_LABELS[lane]">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="card-title">
          {{ LANE_LABELS[lane] }}
        </h2>
        <p class="mt-0.5 text-muted">
          {{ descriptions[lane] }}
        </p>
      </div>
      <StateChip :state="chip" />
    </div>

    <dl class="grid grid-cols-2 gap-3">
      <div>
        <dt class="label">
          {{ state.running ? 'Started' : 'Next run' }}
        </dt>
        <dd v-if="state.running && state.current" class="mt-0.5">
          <span class="font-mono">{{ clock.time(state.current.startedAt) }}</span>
          <span class="text-muted"> · {{ formatDuration(store.now - state.current.startedAt) }}</span>
        </dd>
        <dd v-else-if="nextAt" class="mt-0.5">
          <span class="font-mono">{{ clock.time(nextAt) }}</span>
          <span class="text-muted"> · {{ formatRelative(nextAt, store.now) }}</span>
        </dd>
        <dd v-else class="mt-0.5 text-muted">
          {{ state.paused ? 'Paused' : 'Nothing scheduled' }}
        </dd>
      </div>
      <div>
        <dt class="label">
          Last run
        </dt>
        <dd v-if="state.lastRun" class="mt-0.5">
          <RouterLink :to="timeline(state.lastRun.id)" class="underline decoration-muted underline-offset-2 hover:decoration-ink">
            <span class="font-mono">{{ clock.when(state.lastRun.startedAt) }}</span>
          </RouterLink>
          <span :class="state.lastRun.ok ? 'text-muted' : 'text-bad'"> · {{ state.lastRun.ok ? 'OK' : 'failed' }}</span>
        </dd>
        <dd v-else class="mt-0.5 text-muted">
          None yet
        </dd>
      </div>
    </dl>

    <div>
      <p class="label">
        Schedule
      </p>
      <p class="mt-0.5 text-muted">
        {{ scheduleText }}
      </p>
    </div>

    <p v-if="note" class="text-warn">
      {{ note }}
    </p>
    <RouterLink v-if="state.running || state.pending" :to="timeline(state.running ? 'current' : 'pending')" class="font-semibold underline underline-offset-2">
      Watch this run on the timeline
    </RouterLink>

    <div class="flex flex-col gap-3 border-t border-line pt-4">
      <div class="flex flex-wrap items-center gap-2">
        <ConfirmButton
          variant="primary"
          :confirm="social"
          confirm-label="Run and post publicly?"
          :disabled="!canRun"
          @confirmed="run"
        >
          Run now
        </ConfirmButton>
        <template v-if="lane === 'fast'">
          <label class="flex min-h-10 items-center gap-2">
            <input v-model="translations" type="checkbox" class="size-4 accent-accent" />
            Include translations
          </label>
          <label class="flex min-h-10 items-center gap-2">
            <input v-model="social" type="checkbox" class="size-4 accent-accent" />
            Post to social
          </label>
        </template>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="btn"
          :disabled="busy || state.running"
          @click="setPaused(!state.paused)"
        >
          {{ state.paused ? 'Resume' : 'Pause' }}
        </button>
        <ConfirmButton
          :confirm-label="state.enabled ? 'Stop scheduled runs?' : 'Start scheduled runs?'"
          :disabled="busy || state.running"
          @confirmed="setScheduling(!state.enabled)"
        >
          Turn scheduling {{ state.enabled ? 'off' : 'on' }}
        </ConfirmButton>
      </div>

      <p v-if="state.running" class="text-muted">
        Pause and scheduling unlock when the current run finishes.
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { clock } from '../clock.js';
import { formatDuration, formatRelative, LANE_LABELS, runKind } from '../lib/format.js';
import { act, store } from '../store.js';
import ConfirmButton from './ConfirmButton.vue';
import StateChip from './StateChip.vue';

const props = defineProps({
  lane: { type: String, required: true },
  state: { type: Object, required: true },
  // { second, slots: [[minute, options], ...] }: when the lane runs each hour.
  schedule: { type: Object, required: true },
});

const timeline = id => ({ name: 'timeline', query: { item: `run:${props.lane}:${id}` } });

// For example "Every hour: quick at :00 :01, full at :05 :10", or "Every hour at :20".
const scheduleText = computed(() => {
  let byKind = new Map();

  for (let [minute, options] of props.schedule.slots) {
    let kind = runKind(options);

    byKind.set(kind, [...(byKind.get(kind) ?? []), `:${String(minute).padStart(2, '0')}`]);
  }

  let parts = [...byKind].map(([kind, minutes]) => [kind, 'at', minutes.join(' ')].filter(Boolean).join(' '));

  return byKind.size === 1 && byKind.has(null) ? `Every hour ${parts[0]}.` : `Every hour: ${parts.join(', ')}.`;
});

const descriptions = {
  fast: 'Schedules, gear, co-op, festivals and stages, then social posts. Quick runs skip translations.',
  slow: 'X-Rank, Splatfest rankings and seasonal avatars.',
};

const translations = ref(true);
const social = ref(false);

const busy = computed(() => !!store.busy);
const canRun = computed(() => !busy.value && !props.state.paused && !props.state.pending);

const chip = computed(() => {
  if (props.state.running) return 'running';
  if (props.state.pending) return 'queued';
  if (props.state.paused) return 'paused';

  return props.state.enabled ? 'scheduled' : 'off';
});

const nextAt = computed(() => {
  if (props.state.paused) return null;
  if (props.state.pending?.status === 'queued') return props.state.pending.notBefore ?? store.now;

  return props.state.enabled ? props.state.retryAt ?? props.state.next?.at ?? null : null;
});

const note = computed(() => {
  let state = props.state;

  if (state.pending?.status === 'queued') return `A manual ${[runKind(state.pending), 'run'].filter(Boolean).join(' ')} is queued.`;
  if (state.retryAt && state.continuing) return `Continuing unfinished work (${state.continuations} so far).`;
  if (state.retryAt) return `Retrying after a failure (attempt ${state.retries}).`;
  if (state.paused) return 'Paused: no scheduled or manual runs until resumed.';
  if (!state.enabled) return 'Scheduled runs are off. Manual runs still work.';

  return null;
});

function run() {
  let fast = props.lane === 'fast';
  let withSocial = fast && social.value;
  let options = fast ? { translations: translations.value } : {};
  let description = [runKind(options), 'run'].filter(Boolean).join(' ');

  act(`run:${props.lane}`, '/run', { lane: props.lane, ...options, social: withSocial },
    `Queued a ${description} on the ${props.lane} lane${withSocial ? ', with social posts' : ', data only'}.`);
  social.value = false;
  translations.value = true;
}

function setPaused(paused) {
  act(`pause:${props.lane}`, '/pause', { lane: props.lane, paused }, `${LANE_LABELS[props.lane]} ${paused ? 'paused' : 'resumed'}.`);
}

function setScheduling(enabled) {
  act(`scheduling:${props.lane}`, '/scheduling', { lane: props.lane, enabled },
    `Scheduled runs turned ${enabled ? 'on' : 'off'} for the ${props.lane} lane.`);
}
</script>
