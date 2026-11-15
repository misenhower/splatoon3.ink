<template>
  <section class="card flex flex-col gap-1" aria-label="Accounts">
    <h2 class="card-title mb-1">
      Accounts
    </h2>

    <div
      v-for="account in accounts"
      :key="account.key"
      class="flex items-center justify-between gap-3 border-b border-raised py-1.5"
    >
      <div class="flex min-w-0 flex-col">
        <span class="font-semibold">{{ account.name }}</span>
        <span v-if="!account.configured" class="text-muted">No credentials set</span>
        <span v-else-if="!account.enabled" class="text-warn">
          Off since {{ clock.when(account.disabledAt, false) }}
        </span>
        <span v-else-if="failures[account.key]" class="text-bad">
          {{ failures[account.key] }} failing {{ failures[account.key] === 1 ? 'status' : 'statuses' }}
        </span>
        <span v-else class="text-muted">Posting</span>
      </div>
      <ToggleSwitch
        :on="account.enabled"
        :disabled="!!store.busy"
        :aria-label="`Posting to ${account.name}`"
        @toggle="enabled => toggle(account, enabled)"
      />
    </div>

    <p class="pt-2 text-muted">
      An account switched off gets no posts, scheduled or by hand. When switched on again, it gets whatever is current at the next run.
    </p>
  </section>
</template>

<script setup>
import { clock } from '../clock.js';
import { act, refreshSocial, store } from '../store.js';
import ToggleSwitch from './ToggleSwitch.vue';

defineProps({
  accounts: { type: Array, required: true },
  // How many statuses are failing right now, by account key.
  failures: { type: Object, default: () => ({}) },
});

async function toggle(account, enabled) {
  await act(`social:account:${account.key}`, '/social/account', { key: account.key, enabled },
    `Posting turned ${enabled ? 'on' : 'off'} for ${account.name}.`);
  await refreshSocial();
}
</script>
