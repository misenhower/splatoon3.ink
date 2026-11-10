<template>
  <section class="card flex min-w-0 flex-col gap-4" aria-label="Details" aria-live="polite">
    <RunDetail v-if="item?.run" :run="item.run" />

    <!-- A run or renewal that has not started yet -->
    <template v-else-if="item && isFuture(item)">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="card-title">
          {{ item.title }} <span class="text-muted">·</span> <span class="font-mono">{{ clock.when(item.at) }}</span>
        </h2>
        <StateChip :state="item.state" />
      </div>

      <dl class="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-3">
        <div>
          <dt class="label">
            Starts
          </dt>
          <dd class="mt-0.5 font-mono">
            {{ item.state === 'queued' && item.at <= store.now ? 'any moment' : formatRelative(item.at, store.now) }}
          </dd>
        </div>
        <div v-if="item.slot">
          <dt class="label">
            Trigger
          </dt>
          <dd class="mt-0.5">
            {{ TRIGGER_LABELS[item.slot.trigger] ?? item.slot.trigger }}
          </dd>
        </div>
        <div v-if="item.slot">
          <dt class="label">
            Mode
          </dt>
          <dd class="mt-0.5 font-mono">
            {{ item.slot.mode }}
          </dd>
        </div>
      </dl>

      <p class="text-muted">
        {{ upcomingNote }}
      </p>

      <div class="flex flex-wrap items-center gap-2">
        <RouterLink :to="{ name: 'controls' }" class="btn">
          Open controls
        </RouterLink>
      </div>
    </template>

    <!-- A credential renewal -->
    <template v-else-if="item?.kind === 'auth'">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="card-title">
          {{ item.title }} <span class="text-muted">·</span> <span class="font-mono">{{ clock.when(item.at) }}</span>
        </h2>
        <StateChip :state="item.state" />
      </div>

      <dl class="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-3">
        <div>
          <dt class="label">
            Trigger
          </dt>
          <dd class="mt-0.5">
            {{ TRIGGER_LABELS[item.event.trigger] ?? 'Renewal' }}
          </dd>
        </div>
        <div>
          <dt class="label">
            Duration
          </dt>
          <dd class="mt-0.5 font-mono">
            {{ formatDuration(item.event.finishedAt - item.event.at) }}
          </dd>
        </div>
        <div v-if="nextRenewal">
          <dt class="label">
            Next renewal
          </dt>
          <dd class="mt-0.5 font-mono">
            {{ clock.time(nextRenewal, false) }}
          </dd>
        </div>
      </dl>

      <p
        v-for="error in item.event.errors"
        :key="error"
        class="rounded-lg border border-bad/50 bg-bad/10 px-3 py-2 text-bad"
      >
        {{ error }}
      </p>
      <p v-if="!item.event.ok" class="text-muted">
        The tokens from the last successful renewal keep working for about two hours, so one failed renewal does not stop updates.
      </p>

      <div class="flex flex-col gap-2">
        <div class="flex items-baseline justify-between gap-3">
          <h3 class="label">
            Log
          </h3>
          <span v-if="logs?.omitted" class="text-xs text-muted">{{ logs.omitted }} later lines not kept</span>
        </div>
        <LogLines v-if="logs?.lines.length" :lines="logs.lines" class="max-h-72" />
        <p v-else class="text-muted">
          {{ logError ?? (logs ? 'This renewal printed nothing.' : 'Loading…') }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="btn"
          :disabled="!!store.busy"
          @click="renew"
        >
          {{ store.busy === `auth:${item.region}` ? 'Renewing…' : `Renew ${item.region} now` }}
        </button>
        <button type="button" class="btn" @click="copyLink">
          {{ copied ? 'Link copied' : 'Copy link' }}
        </button>
      </div>
    </template>

    <!-- One status going out to the social accounts -->
    <template v-else-if="item?.kind === 'post'">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="card-title">
          {{ item.title }} <span class="text-muted">·</span> <span class="font-mono">{{ clock.when(item.at) }}</span>
        </h2>
        <StateChip :state="item.state" />
      </div>

      <dl class="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-3">
        <div>
          <dt class="label">
            Posted by
          </dt>
          <dd class="mt-0.5">
            <button
              v-if="sourceRun"
              type="button"
              class="underline decoration-muted underline-offset-2 hover:decoration-ink"
              @click="emit('select', sourceRun.key)"
            >
              Fast lane run at <span class="font-mono">{{ clock.time(sourceRun.at) }}</span>
            </button>
            <template v-else>
              {{ item.group.manual ? 'By hand, from the Social page' : 'A fast lane run' }}
            </template>
          </dd>
        </div>
        <div>
          <dt class="label">
            Accounts
          </dt>
          <dd class="mt-0.5">
            {{ item.summary }}
          </dd>
        </div>
      </dl>

      <div class="flex flex-col border-t border-line">
        <div
          v-for="(delivery, index) in item.group.deliveries"
          :key="index"
          class="flex items-baseline justify-between gap-3 border-b border-raised py-2"
        >
          <span>
            <span class="font-mono text-muted">{{ clock.time(delivery.at) }}</span>
            <span class="ml-3">{{ delivery.client?.name ?? 'Generating the status' }}</span>
          </span>
          <span v-if="delivery.ok" class="text-ok">Posted</span>
          <span v-else class="text-right text-bad">{{ delivery.error ?? 'Failed' }}</span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <RouterLink :to="socialLink" class="btn">
          Open on the Social page
        </RouterLink>
        <button type="button" class="btn" @click="copyLink">
          {{ copied ? 'Link copied' : 'Copy link' }}
        </button>
      </div>
    </template>

    <p v-else class="py-10 text-center text-muted">
      {{ missing ? 'This is older than the history that is kept, or not loaded yet.' : 'Select something in the timeline or the list to see what happened.' }}
    </p>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api.js';
import { clock } from '../clock.js';
import { isFuture } from '../lib/activity.js';
import { formatDuration, formatRelative, TRIGGER_LABELS } from '../lib/format.js';
import { act, activity, store } from '../store.js';
import LogLines from './LogLines.vue';
import RunDetail from './RunDetail.vue';
import StateChip from './StateChip.vue';

const props = defineProps({
  // The selected item from lib/activity.js, or null.
  item: { type: Object, default: null },
  // True when something is selected in the address but is not among the loaded items.
  missing: { type: Boolean, default: false },
});

const emit = defineEmits(['select']);

const copied = ref(false);

const upcomingNote = computed(() => {
  let item = props.item;

  if (item.kind === 'auth') return `Renews the ${item.region} region's Nintendo tokens, which last about two hours.`;
  if (item.state === 'queued') return 'Queued from the panel. It starts as soon as the lane is free.';
  if (item.slot.trigger === 'retry') return 'The last run failed, so the lane tries again before its next regular slot.';
  if (item.slot.trigger === 'continuation') return 'The last run stopped at its time budget; this one picks up what was left.';

  return item.row === 'fast'
    ? 'Updates the data, then posts anything that has become due.'
    : 'Updates X-Rank, Splatfest rankings and seasonal avatars.';
});

// Credential renewals: what the renewal printed is fetched once; it never changes.
const cache = new Map();
const logs = ref(null);
const logError = ref(null);

watch(() => props.item?.kind === 'auth' && props.item.event ? props.item.key : null, async key => {
  logs.value = key ? cache.get(key) ?? null : null;
  logError.value = null;

  if (!key || logs.value) return;

  try {
    let { event } = await api.authEvent(props.item.region, props.item.event.at);

    cache.set(key, event.logs ?? { lines: [], omitted: 0 });

    if (props.item?.key === key) {
      logs.value = cache.get(key);
    }
  } catch (error) {
    if (props.item?.key === key) {
      logError.value = error.message;
    }
  }
}, { immediate: true });

const nextRenewal = computed(() => {
  let at = store.status.auth[props.item.region]?.alarmAt;

  return at && at > store.status.now ? at : null;
});

function renew() {
  let region = props.item.region;

  act(`auth:${region}`, '/auth/refresh', { region }, `Renewed credentials for ${region}.`);
}

// Social posts: the run that sent them, and where to look at the account on the Social page.
const sourceRun = computed(() => props.item.group.runId
  ? activity.value.find(item => item.key === `run:fast:${props.item.group.runId}`) ?? null
  : null);

const socialLink = computed(() => {
  let group = props.item.group;
  let delivery = group.deliveries.find(entry => !entry.ok && entry.client) ?? group.deliveries.find(entry => entry.client);

  return {
    name: 'social',
    query: group.generator && delivery ? { status: group.generator.key, account: delivery.client.key } : {},
  };
});

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
