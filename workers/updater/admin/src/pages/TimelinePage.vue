<template>
  <div class="flex flex-col gap-4">
    <p
      v-for="notice in notices"
      :key="notice"
      class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warn/50 bg-warn/10 px-4 py-2.5 text-warn"
    >
      {{ notice }}
      <RouterLink :to="{ name: 'controls' }" class="font-semibold underline underline-offset-2">
        Open controls
      </RouterLink>
    </p>

    <section class="card flex flex-col gap-3" aria-label="Timeline">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-lg font-semibold">
          Timeline <span class="text-sm font-normal text-muted">{{ clock.zone() }} time · drag to move through the last {{ historyHours }} hours</span>
        </h1>
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
          <ul class="flex flex-wrap gap-4 text-[13px] text-muted" aria-label="Legend">
            <li class="flex items-center gap-1.5">
              <span class="h-2.5 w-2.5 rounded-xs bg-ok" aria-hidden="true" />OK
            </li>
            <li class="flex items-center gap-1.5">
              <span class="h-4 w-2.5 rounded-xs bg-bad" aria-hidden="true" />Failed
            </li>
            <li class="flex items-center gap-1.5">
              <span class="h-2.5 w-2.5 rounded-xs bg-busy" aria-hidden="true" />Running
            </li>
            <li class="flex items-center gap-1.5">
              <span class="h-2.5 w-2.5 rounded-xs border border-muted/70" aria-hidden="true" />Upcoming
            </li>
          </ul>
          <div class="flex items-center gap-2">
            <div class="segmented" role="group" aria-label="Hours in view">
              <button
                v-for="option in ZOOMS"
                :key="option"
                type="button"
                :aria-pressed="view.hours === option"
                @click="setZoom(option)"
              >
                {{ option }}h
              </button>
            </div>
            <button
              type="button"
              class="btn min-h-9"
              :disabled="view.live"
              @click="jumpToNow"
            >
              Now
            </button>
          </div>
        </div>
      </div>

      <TimelineChart
        :items="activity"
        :origin="origin"
        :end="end"
        :loaded-from="store.history.from"
        :selected-key="selectedKey"
        @select="select"
      />
    </section>

    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
      <ActivityList :items="activity" :selected-key="selectedKey" @select="select" />
      <ActivityDetail :item="selected" :missing="!!route.query.item && !selected" @select="select" />
    </div>

    <LogPanel :selected-key="selectedKey" @select="select" />
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { api } from '../api.js';
import { clock } from '../clock.js';
import ActivityDetail from '../components/ActivityDetail.vue';
import ActivityList from '../components/ActivityList.vue';
import LogPanel from '../components/LogPanel.vue';
import TimelineChart from '../components/TimelineChart.vue';
import { defaultSelection, followSelection, FUTURE_MS, MARKER } from '../lib/activity.js';
import { LANE_LABELS } from '../lib/format.js';
import { HOUR, MINUTE } from '../lib/runs.js';
import { activity, historyStart, loadHistory, store } from '../store.js';
import { moveCursor, setZoom, view, ZOOMS } from '../view.js';

const route = useRoute();
const router = useRouter();

const historyHours = computed(() => Math.round((store.status.historyMs ?? 48 * HOUR) / HOUR));

// The whole scrollable timeline: from the oldest history kept when the page opened, to a few
// hours ahead. Its start stays put so that positions do not shift under the scroll; its end
// moves on with the clock, an hour at a time.
const origin = Math.floor(historyStart.value / HOUR) * HOUR;
const end = computed(() => Math.ceil((store.status.now + FUTURE_MS) / HOUR) * HOUR);

const notices = computed(() => Object.entries(store.status.lanes).flatMap(([lane, state]) => {
  if (!state.enabled) return [`${LANE_LABELS[lane]} scheduling is off: it only runs when started by hand.`];

  return [];
}));

// The selected item lives in the address (?item=run:fast:<id>), so it can be linked to.
const selectedKey = computed(() => route.query.item ?? defaultSelection(activity.value));
const selected = computed(() => activity.value.find(item => item.key === selectedKey.value) ?? null);

// Bring an item into the timeline's view if it is outside it. The list looks after itself.
function reveal(item) {
  let left = view.cursor - MARKER * view.span;
  let margin = view.span * 0.04;

  if (item.at < left + margin || item.at > left + view.span - margin) {
    view.live = false;
    moveCursor(item.at, 'reveal');
  }
}

function select(key) {
  router.replace({ query: { ...route.query, item: key } });

  let item = activity.value.find(candidate => candidate.key === key);

  if (item) {
    reveal(item);
  }
}

function jumpToNow() {
  view.live = true;
  moveCursor(store.now, 'jump');
}

// An upcoming run that starts, or a running one that finishes, gets a new key; the selection
// moves along with it.
let last = null;

watch(activity, items => {
  let key = route.query.item;

  if (key && last?.key === key && !items.some(item => item.key === key)) {
    let next = followSelection(last, items);

    if (next) {
      router.replace({ query: { ...route.query, item: next } });
    }
  }

  last = selected.value ?? last;
});

watch(selected, item => last = item ?? last, { immediate: true });

// Follow the clock until the timeline or the list is moved away from the present.
watch(() => store.now, now => {
  if (view.live && !view.dragging && Date.now() - view.scrubbedAt > 1500) {
    moveCursor(now, 'now');
  }
});

// Load earlier history as the timeline is scrolled back towards the part that is not loaded.
watch(() => [view.cursor, view.span, store.history.from, store.history.loading], () => {
  let wanted = view.cursor - (MARKER + 0.5) * view.span;

  if (store.history.from !== null && !store.history.loading && !store.history.error && wanted < store.history.from) {
    loadHistory(wanted);
  }
});

// A link to something older than what is loaded: find out when it happened, load back to
// then, and go there.
async function openLinked(key) {
  let [kind, owner, id] = key.split(':');
  let at = null;

  try {
    if (kind === 'run' && !['current', 'pending', 'slot'].includes(id)) {
      at = (await api.run(owner, id)).run.startedAt;
    } else if (kind === 'auth' && Number(id)) {
      at = Number(id);
    } else if (kind === 'archive') {
      // The compressor's whole history comes with the status.
      at = store.status?.archive?.runs.find(run => run.id === owner)?.startedAt ?? null;
    }
  } catch {
    // The details panel says it could not be found.
  }

  if (!at) return;

  await loadHistory(at - 10 * MINUTE);

  let item = activity.value.find(candidate => candidate.key === key);

  if (item && route.query.item === key) {
    view.live = false;
    moveCursor(item.at, 'jump');
  }
}

onMounted(() => {
  view.live = true;
  moveCursor(store.now, 'jump');

  let key = route.query.item;

  if (!key) return;

  // Opening a link goes straight to the item, in the timeline and in the list.
  if (selected.value) {
    view.live = false;
    moveCursor(selected.value.at, 'jump');
  } else {
    openLinked(key);
  }
});
</script>
