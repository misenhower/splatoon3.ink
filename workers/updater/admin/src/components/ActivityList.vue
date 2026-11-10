<template>
  <section class="card flex min-w-0 flex-col gap-3" aria-label="Activity">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="card-title">
        Activity
      </h2>
      <span class="text-muted">{{ counted }}</span>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div class="segmented" role="group" aria-label="Show">
        <button
          v-for="option in FILTERS"
          :key="option.key"
          type="button"
          :aria-pressed="view.filter.row === option.key"
          @click="view.filter.row = option.key"
        >
          {{ option.label }}
        </button>
      </div>
      <label class="flex min-h-9 items-center gap-2">
        <input v-model="view.filter.problems" type="checkbox" class="size-4 accent-accent" />
        Problems only
      </label>
    </div>

    <div class="relative -mx-2">
      <div
        ref="list"
        class="h-[26rem] overflow-y-auto overscroll-y-contain lg:h-[36rem]"
        @scroll.passive="onScroll"
        @keydown.down.prevent="step(1)"
        @keydown.up.prevent="step(-1)"
      >
        <div class="relative" :style="{ height: `${reference + layout.height + trailing}px` }">
          <template v-for="row in windowed" :key="row.key">
            <div
              v-if="row.now"
              class="absolute inset-x-0 flex items-center gap-2 px-2"
              :style="{ top: `${reference + row.top}px`, height: `${row.height}px` }"
            >
              <span class="h-px grow bg-accent/70" />
              <ListNow />
              <span class="h-px grow bg-accent/70" />
            </div>
            <button
              v-else
              type="button"
              class="absolute inset-x-0 grid grid-cols-[4.75rem_1fr_auto] items-center gap-3 rounded-lg px-2 text-left transition-colors"
              :class="[
                row.key === selectedKey ? 'bg-line' : 'hover:bg-raised',
                isFuture(row.item) ? 'text-muted' : '',
              ]"
              :style="{ top: `${reference + row.top}px`, height: `${row.height}px` }"
              :aria-pressed="row.key === selectedKey"
              :data-key="row.key"
              @click="emit('select', row.key)"
            >
              <span class="flex flex-col font-mono leading-tight">
                <span v-if="day(row.item.at)" class="text-[11px] text-muted">{{ day(row.item.at) }}</span>
                <span>{{ time(row.item.at) }}</span>
              </span>
              <span class="flex min-w-0 flex-col">
                <span class="truncate font-semibold">{{ row.item.title }}</span>
                <span class="truncate text-[13px] text-muted">{{ row.item.summary }}</span>
              </span>
              <span class="font-semibold" :class="STATE_TONES[row.item.state]">{{ STATE_LABELS[row.item.state] }}</span>
            </button>
          </template>

          <!-- What lies below the oldest row: more to load, or the end of what is kept. -->
          <div class="absolute inset-x-0 px-2 py-3 text-center text-muted" :style="{ top: `${reference + layout.height}px` }">
            <template v-if="store.history.error">
              <p class="text-bad">
                {{ store.history.error }}
              </p>
              <button type="button" class="btn btn-small mt-2" @click="loadHistory()">
                Try again
              </button>
            </template>
            <p v-else-if="more">
              Loading earlier activity…
            </p>
            <p v-else-if="!items.length">
              Nothing has happened yet.
            </p>
            <p v-else>
              That is everything kept: the last {{ Math.round((store.status.historyMs ?? 0) / 3_600_000) }} hours.
            </p>
          </div>
        </div>
      </div>

      <!-- Where the list meets the timeline's marker. -->
      <span
        class="pointer-events-none absolute left-0 h-3 w-1 -translate-y-1/2 rounded-r-full"
        :class="view.live ? 'bg-accent' : 'bg-ink'"
        :style="{ top: `${reference}px` }"
        aria-hidden="true"
      />
    </div>

    <p v-if="!shown.length && items.length" class="text-muted">
      Nothing loaded matches this filter.
    </p>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { FILTERS, isFuture, layoutList, matchesFilter, offsetAt, timeAt } from '../lib/activity.js';
import { formatClock, formatWhen, STATE_LABELS, STATE_TONES } from '../lib/format.js';
import { historyStart, loadHistory, store } from '../store.js';
import { scrub, view } from '../view.js';
import ListNow from './ListNow.vue';

const props = defineProps({
  // Everything, from lib/activity.js: the same items the timeline draws.
  items: { type: Array, required: true },
  selectedKey: { type: String, default: null },
});

const emit = defineEmits(['select']);

const HEIGHTS = { row: 48, now: 28 };

// Rows this far outside the visible part of the list are still drawn.
const OVERSCAN = 400;

const list = ref(null);
const scrollTop = ref(0);
const height = ref(0);

const shown = computed(() => props.items.filter(item => matchesFilter(item, view.filter)));
const layout = computed(() => layoutList(shown.value, store.status.now, HEIGHTS));
const nowRow = computed(() => layout.value.rows.find(row => row.now));

// The list lines up with the timeline's marker this far below its top edge, so a few of the
// things still to come show above the present.
const reference = computed(() => Math.round(Math.min(3 * HEIGHTS.row, height.value * 0.3)));

// Room below the last row, so that it can be scrolled up to the reference line too.
const trailing = computed(() => Math.max(height.value - reference.value, 96));

const windowed = computed(() => layout.value.rows.filter(row =>
  row.top + row.height > scrollTop.value - reference.value - OVERSCAN
  && row.top < scrollTop.value - reference.value + height.value + OVERSCAN));

const more = computed(() => store.history.loading || (store.history.from !== null && store.history.from > historyStart.value));

const counted = computed(() => {
  let total = props.items.length;

  return shown.value.length === total ? `${total} loaded` : `${shown.value.length} of ${total} loaded`;
});

// Times against the last status rather than the ticking clock, so rows are not redrawn every second.
const time = at => formatClock(at, { utc: store.utc });
const day = at => {
  let when = formatWhen(at, store.status.now, { seconds: false, utc: store.utc });

  return when.length > 5 ? when.slice(0, -6) : '';
};

// Scrolling and the cursor. The list follows the cursor, so the row at the reference line is
// the moment under the timeline's marker; scrolling the list by hand moves the cursor instead.
// After a selection brings a row into view the list is "detached": it stays where it is until
// either side is scrolled by hand again.

let applied = null;
let detached = false;
let anchor = null;

const limit = () => list.value.scrollHeight - list.value.clientHeight;

function setScroll(top) {
  let element = list.value;

  top = Math.min(Math.max(top, 0), limit());

  if (Math.abs(element.scrollTop - top) >= 0.5) {
    element.scrollTop = top;
    applied = element.scrollTop;
    scrollTop.value = element.scrollTop;
  }

  remember();
}

// The first row in view and where it sits, to keep a detached list still when rows are added.
function remember() {
  let top = list.value.scrollTop - reference.value;
  let row = layout.value.rows.find(candidate => candidate.top + candidate.height > top);

  anchor = row ? { key: row.key, offset: row.top - top } : null;
}

function align() {
  if (!list.value || !height.value) return;

  detached = false;

  // Following the clock means sitting on the "now" line, wherever the newest rows are.
  setScroll(view.live ? nowRow.value.top : offsetAt(layout.value.rows, view.cursor));
}

function onScroll() {
  let element = list.value;

  scrollTop.value = element.scrollTop;

  if (applied !== null && Math.abs(element.scrollTop - applied) < 1) return;

  applied = null;
  detached = false;
  remember();

  scrub(timeAt(layout.value.rows, element.scrollTop), 'list', Math.abs(element.scrollTop - nowRow.value.top) < 6);
  loadMore();
}

// Fetch earlier history once the end of the list is near: after scrolling there, or when a
// filter leaves so few rows that the end is already in view.
function loadMore() {
  let history = store.history;

  if (more.value && !history.loading && !history.error && limit() - list.value.scrollTop < 2 * OVERSCAN) {
    loadHistory();
  }
}

watch(() => [view.cursor, view.source], () => {
  if (view.source === 'list') return;

  // The timeline moved to show a selected item; the list brings its own row into view below.
  if (view.source === 'reveal') {
    detached = true;

    return;
  }

  if (view.source === 'now' && detached) return;

  align();
});

// New rows (a status update, more history, a filter) keep the list where it is in time.
watch([layout, reference], async () => {
  await nextTick();

  if (!list.value) return;

  if (!detached) {
    align();
  } else {
    let row = anchor && layout.value.rows.find(candidate => candidate.key === anchor.key);

    if (row) {
      setScroll(row.top - anchor.offset + reference.value);
    }
  }

  loadMore();
});

// Bring the selected row into view when it is chosen elsewhere, moving only this list.
function reveal(key) {
  let row = layout.value.rows.find(candidate => candidate.key === key);
  let element = list.value;

  if (!row || !element) return;

  let top = reference.value + row.top;

  if (top < element.scrollTop) {
    setScroll(top - HEIGHTS.row);
    detached = true;
  } else if (top + row.height > element.scrollTop + element.clientHeight) {
    setScroll(top + row.height + HEIGHTS.row - element.clientHeight);
    detached = true;
  }
}

watch(() => props.selectedKey, async key => {
  await nextTick();
  reveal(key);
});

// Arrow keys move the selection through the list.
async function step(direction) {
  let rows = layout.value.rows.filter(row => row.item);
  let index = rows.findIndex(row => row.key === props.selectedKey);
  let next = rows[Math.min(Math.max(index + direction, 0), rows.length - 1)];

  if (!next) return;

  emit('select', next.key);
  await nextTick();
  await nextTick();

  [...list.value.querySelectorAll('button')].find(element => element.dataset.key === next.key)?.focus({ preventScroll: true });
}

let observer = null;

onMounted(() => {
  observer = new ResizeObserver(() => height.value = list.value.clientHeight);
  observer.observe(list.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>
