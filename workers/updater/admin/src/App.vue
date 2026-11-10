<template>
  <div class="min-h-screen">
    <header class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line px-4 py-3 sm:px-6">
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span class="text-[17px] font-bold tracking-tight">
          Splatoon3.ink <span class="font-normal text-muted">Admin</span>
        </span>
        <span
          v-if="store.status"
          class="rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide uppercase"
          :class="environment.class"
        >{{ environment.label }}</span>
        <nav class="flex flex-wrap gap-1" aria-label="Sections">
          <RouterLink
            v-for="link in links"
            :key="link.name"
            :to="{ name: link.name }"
            class="flex min-h-10 items-center rounded-lg px-3 text-muted hover:text-ink"
            active-class="bg-raised font-semibold !text-ink"
          >
            {{ link.label }}
          </RouterLink>
        </nav>
      </div>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted">
        <span class="flex items-center gap-2" :title="store.error ?? 'Status refreshes every 5 seconds'">
          <span class="size-2 rounded-full" :class="store.error ? 'bg-bad' : stale ? 'bg-warn' : 'bg-ok'" aria-hidden="true" />
          <span class="font-mono text-ink">{{ clock.time(store.now) }}</span>
        </span>
        <div class="segmented" role="group" aria-label="Time zone">
          <button type="button" :aria-pressed="store.utc" @click="setUtc(true)">
            UTC
          </button>
          <button type="button" :aria-pressed="!store.utc" @click="setUtc(false)">
            Local
          </button>
        </div>
        <span v-if="store.status" class="max-w-52 truncate">{{ store.status.user.email }}</span>
      </div>
    </header>

    <p v-if="store.error" class="border-b border-bad/40 bg-bad/10 px-4 py-2 text-bad sm:px-6" role="alert">
      {{ store.error }}
      <span v-if="store.status" class="text-muted">Showing status from {{ clock.time(store.loadedAt + store.clockOffset) }}.</span>
    </p>

    <main class="mx-auto max-w-[1500px] p-4 sm:p-6">
      <RouterView v-if="store.status" />
      <p v-else-if="!store.error" class="py-24 text-center text-muted">
        Loading status…
      </p>
    </main>

    <div
      v-if="store.toast"
      class="fixed bottom-5 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-lg border px-4 py-2.5 shadow-xl"
      :class="store.toast.kind === 'error' ? 'border-bad/60 bg-[#2a1a1e] text-bad' : 'border-line bg-raised text-ink'"
      role="status"
    >
      {{ store.toast.text }}
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watchEffect } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { clock } from './clock.js';
import { setUtc, startPolling, store } from './store.js';

const route = useRoute();

const links = [
  { name: 'timeline', label: 'Timeline' },
  { name: 'social', label: 'Social' },
  { name: 'data', label: 'Data' },
];

const environments = {
  production: { label: 'Production', class: 'bg-accent text-accent-ink' },
  dev: { label: 'Dev', class: 'bg-warn/20 text-warn' },
  preview: { label: 'Local preview', class: 'bg-busy/20 text-busy' },
};

const environment = computed(() => environments[store.status?.environment]
  ?? { label: store.status?.environment ?? 'Unknown', class: 'bg-raised text-muted' });

// Status is older than a few polls: the tab was asleep or requests are failing.
const stale = computed(() => store.now - store.clockOffset - store.loadedAt > 20_000);

watchEffect(() => {
  let prefix = store.status?.environment === 'production' ? '' : `[${environment.value.label}] `;

  document.title = `${prefix}${route.meta.title ?? 'Admin'} · Splatoon3.ink Admin`;
});

onMounted(startPolling);
</script>
