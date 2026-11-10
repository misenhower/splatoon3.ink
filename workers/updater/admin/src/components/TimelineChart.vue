<template>
  <div class="relative">
    <div
      ref="scroller"
      class="overflow-x-auto overscroll-x-contain select-none"
      :class="dragging ? 'cursor-grabbing' : 'cursor-grab'"
      tabindex="0"
      role="group"
      aria-label="Timeline. Drag, or use the left and right arrow keys, to move through time."
      @scroll.passive="onScroll"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel.passive="stopGlide"
      @click.capture="onClickCapture"
    >
      <div class="relative" :style="{ width: `${labelWidth + contentWidth}px` }">
        <!-- Axis: the "now" pill above, clock times below -->
        <div class="flex h-12">
          <span ref="label" class="sticky left-0 z-30 w-24 shrink-0 bg-panel sm:w-28" />
          <div class="relative grow">
            <TimelineNow :origin="origin" :scale="scale" pill />
            <span
              v-for="tick in ticks"
              :key="tick"
              class="absolute bottom-0 h-6 border-l border-line pl-1 font-mono text-xs whitespace-nowrap text-muted"
              :style="{ left: `${x(tick)}px` }"
            >{{ when(tick, false) }}</span>
          </div>
        </div>

        <div
          v-for="row in rows"
          :key="row.key"
          class="flex h-14 items-center border-t border-line"
        >
          <span class="sticky left-0 z-30 flex h-full w-24 shrink-0 items-center bg-panel font-semibold sm:w-28">{{ row.label }}</span>
          <div class="timeline-grid relative h-14 grow" :style="gridStyle">
            <span
              v-if="unloadedWidth > 0"
              class="timeline-unloaded absolute inset-y-0 left-0"
              :style="{ width: `${unloadedWidth}px` }"
              aria-hidden="true"
            />

            <button
              v-for="item in row.items"
              :key="item.key"
              type="button"
              tabindex="-1"
              class="absolute -translate-y-1/2 cursor-pointer rounded-xs outline-offset-2 transition-[filter,opacity] hover:brightness-125"
              :class="[
                row.marks[item.key].of > 1 ? stackedShapes[item.state] : shapes[item.state],
                item.key === selectedKey ? 'z-20 ring-2 ring-ink ring-offset-2 ring-offset-panel' : '',
                matchesFilter(item, view.filter) ? '' : 'opacity-25',
              ]"
              :style="row.marks[item.key].style"
              :aria-label="describe(item)"
              :aria-pressed="item.key === selectedKey"
              @click="emit('select', item.key)"
              @mouseenter="hovered = dragging ? null : item"
              @mouseleave="hovered = null"
            />

            <div
              v-if="hovered?.row === row.key"
              class="pointer-events-none absolute bottom-full z-40 -mb-1 rounded-lg border border-line bg-raised px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg"
              :class="tooltipFlipped ? '-translate-x-full' : ''"
              :style="{ left: `${x(hovered.at)}px` }"
              role="tooltip"
            >
              <span class="font-mono">{{ when(hovered.at) }}</span>
              <span class="mx-1.5 text-muted">·</span>
              <span :class="STATE_TONES[hovered.state]">{{ STATE_LABELS[hovered.state] }}</span>
              <span class="mx-1.5 text-muted">·</span>
              <span>{{ hovered.title }}</span>
              <span class="text-muted"> · {{ hovered.summary }}</span>
            </div>
          </div>
        </div>

        <TimelineNow :origin="origin" :scale="scale" :offset="labelWidth" />
      </div>
    </div>

    <TimelineMarker :scale="scale" :style="{ left: `${labelWidth + MARKER * visible}px` }" />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { MARKER, matchesFilter, stackMarks } from '../lib/activity.js';
import { formatWhen, ROW_LABELS, STATE_LABELS, STATE_TONES } from '../lib/format.js';
import { axisTicks, HOUR, tickStep } from '../lib/runs.js';
import { store } from '../store.js';
import { scrub, view } from '../view.js';
import TimelineMarker from './TimelineMarker.vue';
import TimelineNow from './TimelineNow.vue';

const props = defineProps({
  // Everything to draw, from lib/activity.js: the same items the list shows.
  items: { type: Array, required: true },
  // The span of time the whole (scrollable) timeline covers.
  origin: { type: Number, required: true },
  end: { type: Number, required: true },
  // History before this moment has not been loaded yet.
  loadedFrom: { type: Number, default: null },
  selectedKey: { type: String, default: null },
});

const emit = defineEmits(['select']);

// On a narrow screen the chosen number of hours still gets this much width, and less time
// is in view at once.
const MIN_SPAN_PX = 560;

const scroller = ref(null);
const label = ref(null);
const hovered = ref(null);
const dragging = ref(false);

// The scroller's width and the width of the row labels pinned to its left edge.
const width = ref(0);
const labelWidth = ref(112);

const visible = computed(() => Math.max(width.value - labelWidth.value, 0));

// Pixels per millisecond.
const scale = computed(() => Math.max(visible.value, MIN_SPAN_PX) / (view.hours * HOUR));
const contentWidth = computed(() => (props.end - props.origin) * scale.value);

const x = at => (at - props.origin) * scale.value;

const MIN_MARK = 6;
const LEVEL_PX = 15;

const rows = computed(() => Object.entries(ROW_LABELS).map(([key, text]) => {
  let items = props.items.filter(item => item.row === key);
  let spans = items.map(item => {
    // A run in progress reaches up to the present, as of the last status.
    let end = item.end ?? (item.state === 'running' ? store.status.now : item.at);

    return { left: x(item.at), width: Math.max(x(end) - x(item.at), MIN_MARK) };
  });

  // Marks that would cover each other (several posts at once, or runs a minute apart when
  // zoomed out) are stacked, so each can still be seen and clicked.
  let levels = stackMarks(spans, { gap: 0.5 });
  let marks = {};

  items.forEach((item, index) => {
    let { level, of } = levels[index];

    marks[item.key] = {
      of,
      style: {
        left: `${spans[index].left}px`,
        width: `${spans[index].width}px`,
        top: `calc(50% + ${(level - (of - 1) / 2) * LEVEL_PX}px)`,
      },
    };
  });

  return { key, label: text, items, marks };
}));

const step = computed(() => tickStep(view.hours * HOUR));
const ticks = computed(() => axisTicks(props.origin, props.end, step.value));
const gridStyle = computed(() => ({
  backgroundSize: `${step.value * scale.value}px 100%`,
  backgroundPositionX: `${x(Math.ceil(props.origin / step.value) * step.value)}px`,
}));

const unloadedWidth = computed(() => props.loadedFrom === null ? 0 : Math.max(0, x(props.loadedFrom)));
const tooltipFlipped = computed(() => hovered.value && x(hovered.value.at) - (scroller.value?.scrollLeft ?? 0) > visible.value * 0.6);

// Failures are taller as well as a different colour, so they stand out without relying on hue.
const shapes = {
  ok: 'h-4 bg-ok',
  failed: 'h-8 bg-bad',
  incomplete: 'h-6 bg-warn',
  partial: 'h-6 bg-warn',
  running: 'h-4 animate-pulse bg-busy',
  queued: 'h-4 border border-busy',
  upcoming: 'h-4 border border-muted/70',
};

// Stacked marks are all one height; there is no room for failures to stand taller.
const stackedShapes = {
  ok: 'h-3 bg-ok',
  failed: 'h-3 bg-bad',
  incomplete: 'h-3 bg-warn',
  partial: 'h-3 bg-warn',
  running: 'h-3 animate-pulse bg-busy',
  queued: 'h-3 border border-busy',
  upcoming: 'h-3 border border-muted/70',
};

function describe(item) {
  return `${item.title}, ${when(item.at)}, ${STATE_LABELS[item.state]}, ${item.summary}`;
}

// Like clock.when(), but against the last status rather than the ticking clock, so the marks
// are not all redrawn every second.
function when(at, seconds = true) {
  return formatWhen(at, store.status.now, { seconds, utc: store.utc });
}

// Scrolling and the cursor. The marker sits at a fixed place across the visible width; the
// cursor is the moment under it. Scrolling by hand moves the cursor, and a cursor moved from
// elsewhere scrolls the timeline.

// The scroll position last set from the cursor, to tell those scroll events from the user's.
let applied = null;

function scrollFor(cursor) {
  let element = scroller.value;

  return Math.min(Math.max(x(cursor) - MARKER * visible.value, 0), element.scrollWidth - element.clientWidth);
}

function follow() {
  let element = scroller.value;

  if (!element || !visible.value) return;

  let target = scrollFor(view.cursor);

  if (Math.abs(element.scrollLeft - target) >= 0.5) {
    element.scrollLeft = target;
    applied = element.scrollLeft;
  }
}

function onScroll() {
  let element = scroller.value;

  if (applied !== null && Math.abs(element.scrollLeft - applied) < 1) return;

  applied = null;
  hovered.value = null;

  // Coming to rest within a few pixels of the present resumes following the clock.
  let atNow = Math.abs(element.scrollLeft - scrollFor(store.now)) < 6;

  scrub(props.origin + (element.scrollLeft + MARKER * visible.value) / scale.value, 'chart', atNow);
}

watch(() => [view.cursor, view.source], () => view.source !== 'chart' && follow());

// Zooming, resizing, and the timeline growing at its end all keep the cursor where it is.
watch([scale, contentWidth, visible], async () => {
  view.span = visible.value / scale.value;
  await nextTick();
  follow();
});

let observer = null;

onMounted(() => {
  observer = new ResizeObserver(() => {
    width.value = scroller.value.clientWidth;
    labelWidth.value = label.value.offsetWidth;
  });
  observer.observe(scroller.value);
  observer.observe(label.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  stopGlide();
});

// Dragging with a mouse scrolls the timeline, and keeps going briefly after a flick. Touch
// screens already scroll it natively.

let drag = null;
let glide = null;
let suppressClick = false;

function stopGlide() {
  cancelAnimationFrame(glide);
  glide = null;
}

function onPointerDown(event) {
  stopGlide();

  if (event.pointerType === 'touch' || event.button !== 0) return;

  drag = { id: event.pointerId, x: event.clientX, left: scroller.value.scrollLeft, moved: false, samples: [] };
}

function onPointerMove(event) {
  if (!drag || event.pointerId !== drag.id) return;

  let delta = event.clientX - drag.x;

  if (!drag.moved) {
    // A press that barely moves is still a click on a mark.
    if (Math.abs(delta) < 4) return;

    drag.moved = true;
    dragging.value = true;
    view.dragging = true;
    hovered.value = null;
    scroller.value.setPointerCapture(drag.id);
  }

  scroller.value.scrollLeft = drag.left - delta;
  drag.samples.push({ x: event.clientX, at: performance.now() });

  if (drag.samples.length > 5) drag.samples.shift();
}

function onPointerUp(event) {
  if (!drag || event.pointerId !== drag.id) return;

  if (drag.moved) {
    suppressClick = true;
    setTimeout(() => suppressClick = false);

    let first = drag.samples[0];
    let last = drag.samples.at(-1);
    let elapsed = last.at - first.at;

    // Pixels per millisecond over the last few moves; a pause before letting go means no flick.
    if (elapsed > 0 && performance.now() - last.at < 60) {
      startGlide((first.x - last.x) / elapsed);
    }
  }

  drag = null;
  dragging.value = false;
  view.dragging = false;
}

function startGlide(velocity) {
  if (Math.abs(velocity) < 0.2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  velocity = Math.min(Math.max(velocity, -3), 3);

  let previous = performance.now();

  let frame = now => {
    let elapsed = Math.min(now - previous, 50);

    previous = now;
    scroller.value.scrollLeft += velocity * elapsed;
    velocity *= 0.995 ** elapsed;
    glide = Math.abs(velocity) > 0.02 ? requestAnimationFrame(frame) : null;
  };

  glide = requestAnimationFrame(frame);
}

// The click that ends a drag is not a click on whatever is under the pointer.
function onClickCapture(event) {
  if (suppressClick) {
    event.stopPropagation();
    event.preventDefault();
  }
}
</script>
