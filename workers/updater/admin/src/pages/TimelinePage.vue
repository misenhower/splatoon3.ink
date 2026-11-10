<template>
  <div class="flex flex-col gap-6">
    <section class="card flex flex-col gap-3" aria-label="Timeline">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-lg font-semibold">
          {{ clock.time(start, false) }} to {{ clock.time(end, false) }} <span class="font-normal text-muted">{{ clock.zone() }}</span>
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
          <div class="segmented" role="group" aria-label="Timeline range">
            <button
              v-for="option in ranges"
              :key="option"
              type="button"
              :aria-pressed="hours === option"
              @click="hours = option"
            >
              {{ option }}h
            </button>
          </div>
        </div>
      </div>

      <TimelineChart
        :rows="rows"
        :start="start"
        :end="end"
        :now="store.now"
        :selected-key="selectedKey"
        @select="select"
      />
    </section>

    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,22rem)]">
      <RunList :runs="runs" :selected-key="selectedKey" @select="select" />
      <RunDetail :run="selected" />

      <div class="flex flex-col gap-4 lg:col-span-2 lg:grid lg:grid-cols-2 xl:col-span-1 xl:row-span-2 xl:flex">
        <section class="card flex flex-col gap-1 lg:col-span-2" aria-label="Up next">
          <h2 class="card-title mb-1">
            Up next
          </h2>
          <div
            v-for="item in upNext"
            :key="item.key"
            class="flex items-baseline justify-between gap-3 border-b border-raised py-2 last:border-b-0"
          >
            <span>{{ item.label }}</span>
            <span class="text-right whitespace-nowrap">
              <span class="font-mono">{{ clock.time(item.at) }}</span>
              <span class="text-muted"> · {{ formatRelative(item.at, store.now) }}</span>
            </span>
          </div>
          <p v-if="!upNext.length" class="py-2 text-muted">
            Nothing is scheduled.
          </p>
        </section>

        <LaneCard
          v-for="(state, lane) in store.status.lanes"
          :key="lane"
          :lane="lane"
          :state="state"
          :modes="store.status.modes"
        />
        <AuthCard :regions="store.status.auth" class="lg:col-span-2" />
      </div>

      <LogPanel class="lg:col-span-2" :selected-key="selectedKey" @select="select" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { clock } from '../clock.js';
import AuthCard from '../components/AuthCard.vue';
import LaneCard from '../components/LaneCard.vue';
import LogPanel from '../components/LogPanel.vue';
import RunDetail from '../components/RunDetail.vue';
import RunList from '../components/RunList.vue';
import TimelineChart from '../components/TimelineChart.vue';
import { formatRelative, LANE_LABELS } from '../lib/format.js';
import { collectUpcoming, defaultSelection, HOUR, MINUTE, timelineRows } from '../lib/runs.js';
import { runs, store } from '../store.js';

const route = useRoute();
const router = useRouter();

const ranges = [3, 6, 12];
const hours = ref(3);

// Three quarters of the window is the past, the rest is what is coming. The window moves in
// whole minutes so marks do not creep every second.
const anchor = computed(() => Math.floor(store.now / MINUTE) * MINUTE);
const start = computed(() => anchor.value - hours.value * HOUR * 0.75);
const end = computed(() => anchor.value + hours.value * HOUR * 0.25);

const rows = computed(() => timelineRows({ status: store.status, runs: runs.value, start: start.value, end: end.value }));

// The selected run lives in the address (?run=fast:<id>), so a run can be linked to.
const selectedKey = computed(() => {
  let key = route.query.run;

  return runs.value.some(run => run.key === key) ? key : defaultSelection(runs.value);
});

const selected = computed(() => runs.value.find(run => run.key === selectedKey.value) ?? null);

function select(key) {
  router.replace({ query: { ...route.query, run: key } });
}

const upNext = computed(() => {
  let status = store.status;
  let items = collectUpcoming(status, status.now + 2 * HOUR)
    .map(item => ({ key: item.key, at: item.at, label: `${LANE_LABELS[item.lane]}, ${item.mode}${item.trigger === 'scheduled' ? '' : ` (${item.trigger})`}` }));

  let renewals = Object.values(status.auth).map(auth => auth.alarmAt).filter(at => at && at > status.now);

  if (renewals.length) {
    items.push({ key: 'auth', at: Math.min(...renewals), label: `Auth renewal, ${renewals.length} ${renewals.length === 1 ? 'region' : 'regions'}` });
  }

  return items.sort((a, b) => a.at - b.at).slice(0, 5);
});
</script>
