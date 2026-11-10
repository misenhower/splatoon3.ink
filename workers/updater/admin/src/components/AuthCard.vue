<template>
  <section class="card flex flex-col gap-2" aria-label="Nintendo auth">
    <h2 class="card-title">
      Nintendo auth
    </h2>

    <div
      v-for="(auth, region) in regions"
      :key="region"
      class="flex items-center justify-between gap-3 border-b border-raised py-2 last:border-b-0"
    >
      <div class="flex min-w-0 flex-col">
        <span class="font-semibold">{{ region }}</span>
        <span v-if="!auth.hasSessionToken" class="text-muted">No session token set</span>
        <span v-else-if="failure(auth)" class="text-bad">{{ failure(auth) }}</span>
        <span v-else-if="auth.lastRefreshAt" class="text-muted">
          Renewed {{ formatRelative(auth.lastRefreshAt, store.now) }}
        </span>
        <span v-else class="text-muted">Not renewed yet</span>
        <span class="text-[13px] text-muted">
          <template v-if="auth.alarmAt">
            Next at <span class="font-mono">{{ clock.time(auth.alarmAt, false) }}</span>
          </template>
          <template v-if="auth.alarmAt && auth.events?.[0]">
            ·
          </template>
          <RouterLink
            v-if="auth.events?.[0]"
            :to="{ name: 'timeline', query: { item: `auth:${region}:${auth.events[0].at}` } }"
            class="underline decoration-muted underline-offset-2 hover:decoration-ink"
          >
            Last renewal
          </RouterLink>
        </span>
      </div>
      <button
        type="button"
        class="btn btn-small"
        :disabled="!!store.busy || !auth.hasSessionToken"
        @click="refresh(region)"
      >
        {{ store.busy === `auth:${region}` ? 'Renewing…' : 'Renew now' }}
      </button>
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router';
import { clock } from '../clock.js';
import { formatRelative } from '../lib/format.js';
import { act, store } from '../store.js';

defineProps({
  regions: { type: Object, required: true },
});

// The most recent renewal's error, if it failed.
function failure(auth) {
  let latest = auth.events?.[0];

  return latest && !latest.ok ? latest.errors[0] ?? 'Last renewal failed' : null;
}

function refresh(region) {
  act(`auth:${region}`, '/auth/refresh', { region }, `Renewed credentials for ${region}.`);
}
</script>
