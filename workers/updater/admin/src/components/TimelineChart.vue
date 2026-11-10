<template>
  <div ref="scroller" class="overflow-x-auto">
    <div class="min-w-[880px]">
      <!-- Axis -->
      <div class="grid h-7 grid-cols-[7rem_1fr]">
        <span class="sticky left-0 z-30 bg-panel" />
        <div class="relative">
          <span
            v-for="tick in ticks"
            :key="tick"
            class="absolute top-0 h-7 border-l border-line pl-1 font-mono text-xs text-muted"
            :style="{ left: position(tick) }"
          >{{ labelled(tick) ? clock.time(tick, false) : '' }}</span>
          <span
            class="absolute top-0 z-10 -translate-x-1/2 rounded-full bg-accent px-2 py-px text-xs font-semibold whitespace-nowrap text-accent-ink"
            :style="{ left: position(now) }"
          >Now {{ clock.time(now, false) }}</span>
        </div>
      </div>

      <div
        v-for="row in rows"
        :key="row.key"
        class="grid h-14 grid-cols-[7rem_1fr] items-center border-t border-line"
      >
        <span class="sticky left-0 z-30 flex h-full items-center bg-panel font-semibold">{{ row.label }}</span>
        <div class="relative h-14">
          <span
            v-for="tick in ticks"
            :key="tick"
            class="absolute top-0 h-14 border-l border-line/50"
            :style="{ left: position(tick) }"
            aria-hidden="true"
          />
          <span class="absolute top-0 z-10 h-14 w-0.5 bg-accent/70" :style="{ left: position(now) }" aria-hidden="true" />

          <template v-for="mark in row.marks" :key="mark.key">
            <button
              v-if="mark.selectable"
              type="button"
              class="absolute top-1/2 min-w-1.5 -translate-y-1/2 rounded-xs outline-offset-2 transition-[filter] hover:brightness-125"
              :class="[
                shapes[mark.state],
                mark.key === selectedKey ? 'z-20 ring-2 ring-ink ring-offset-2 ring-offset-panel' : '',
              ]"
              :style="span(mark)"
              :aria-label="describe(row, mark)"
              :aria-pressed="mark.key === selectedKey"
              @click="emit('select', mark.key)"
              @mouseenter="hovered = { row, mark }"
              @mouseleave="hovered = null"
              @focus="hovered = { row, mark }"
              @blur="hovered = null"
            />
            <RouterLink
              v-else-if="mark.to"
              :to="mark.to"
              class="absolute top-1/2 min-w-1.5 -translate-y-1/2 rounded-xs transition-[filter] hover:brightness-125"
              :class="shapes[mark.state]"
              :style="span(mark)"
              :aria-label="describe(row, mark)"
              @mouseenter="hovered = { row, mark }"
              @mouseleave="hovered = null"
              @focus="hovered = { row, mark }"
              @blur="hovered = null"
            />
            <span
              v-else
              class="absolute top-1/2 min-w-1.5 -translate-y-1/2 rounded-xs"
              :class="shapes[mark.state]"
              :style="span(mark)"
              @mouseenter="hovered = { row, mark }"
              @mouseleave="hovered = null"
            />
          </template>

          <div
            v-if="hovered?.row === row"
            class="pointer-events-none absolute bottom-full z-30 mb-1 rounded-lg border border-line bg-raised px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg"
            :class="tooltipSide(hovered.mark)"
            :style="{ left: position(hovered.mark.at) }"
            role="tooltip"
          >
            <span class="font-mono">{{ clock.time(hovered.mark.at) }}</span>
            <span class="mx-1.5 text-muted">·</span>
            <span :class="tones[hovered.mark.state]">{{ stateLabels[hovered.mark.state] }}</span>
            <span class="mx-1.5 text-muted">·</span>
            <span>{{ hovered.mark.title }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { clock } from '../clock.js';
import { axisTicks } from '../lib/runs.js';

const props = defineProps({
  rows: { type: Array, required: true },
  start: { type: Number, required: true },
  end: { type: Number, required: true },
  now: { type: Number, required: true },
  selectedKey: { type: String, default: null },
});

const emit = defineEmits(['select']);

const hovered = ref(null);
const scroller = ref(null);

// On a narrow screen the chart scrolls sideways; start with "now" in view rather than the
// oldest runs.
onMounted(() => {
  let element = scroller.value;
  let labels = 112;

  element.scrollLeft = labels + (element.scrollWidth - labels) * fraction(props.now) - element.clientWidth * 0.65;
});
const ticks = computed(() => axisTicks(props.start, props.end));

// Failures are taller as well as a different colour, so they stand out without relying on hue.
const shapes = {
  ok: 'h-4 bg-ok',
  failed: 'h-8 bg-bad',
  incomplete: 'h-6 bg-warn',
  running: 'h-4 animate-pulse bg-busy',
  upcoming: 'h-4 border border-muted/70',
};

const tones = {
  ok: 'text-ok',
  failed: 'text-bad',
  incomplete: 'text-warn',
  running: 'text-busy',
  upcoming: 'text-muted',
};

const stateLabels = {
  ok: 'OK',
  failed: 'Failed',
  incomplete: 'Unfinished',
  running: 'Running',
  upcoming: 'Upcoming',
};

function fraction(at) {
  return (at - props.start) / (props.end - props.start);
}

function position(at) {
  return `${(Math.min(Math.max(fraction(at), 0), 1) * 100).toFixed(3)}%`;
}

function span(mark) {
  let left = Math.max(fraction(mark.at), 0);
  let right = Math.min(fraction(mark.end), 1);

  return { left: `${(left * 100).toFixed(3)}%`, width: `${(Math.max(right - left, 0) * 100).toFixed(3)}%` };
}

// Skip labels that would run off the right edge or sit under the "Now" pill.
function labelled(tick) {
  let at = fraction(tick);

  return at < 0.96 && (at < fraction(props.now) - 0.045 || at > fraction(props.now) + 0.035);
}

function tooltipSide(mark) {
  return fraction(mark.at) > 0.7 ? '-translate-x-full' : '';
}

function describe(row, mark) {
  return `${row.label}, ${clock.time(mark.at)}, ${stateLabels[mark.state]}, ${mark.title}`;
}
</script>
