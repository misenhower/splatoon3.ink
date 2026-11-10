<template>
  <section class="card flex flex-col gap-3" aria-label="Last posted">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="card-title">
        Last posted
      </h2>
      <span class="text-muted">Select a cell to preview that status and post it to that account.</span>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[820px] border-collapse text-left">
        <thead>
          <tr class="border-b border-line">
            <th scope="col" class="label py-2 pr-3 font-normal">
              Status
            </th>
            <th
              v-for="account in accounts"
              :key="account.key"
              scope="col"
              class="label px-2 py-2 font-normal"
            >
              {{ account.name }}
              <span v-if="!account.enabled" class="block normal-case text-warn">off</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="generator in visible" :key="generator.key" class="border-b border-raised">
            <th scope="row" class="py-1 pr-3 font-semibold whitespace-nowrap">
              {{ generator.name }}
            </th>
            <td v-for="account in accounts" :key="account.key" class="p-0.5">
              <button
                type="button"
                class="min-h-9 w-full rounded-md px-1.5 text-left font-mono text-[13px] whitespace-nowrap hover:bg-raised"
                :class="[
                  isSelected(generator, account) ? 'bg-raised ring-2 ring-accent ring-inset' : '',
                  cell(generator, account).failure ? 'font-semibold text-bad' : cell(generator, account).postedAt ? '' : 'text-muted',
                ]"
                :aria-pressed="isSelected(generator, account)"
                :aria-label="`${generator.name} on ${account.name}: ${text(generator, account)}`"
                @click="emit('select', { generator: generator.key, account: account.key })"
              >
                {{ text(generator, account) }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <button
      v-if="quiet.length"
      type="button"
      class="self-start text-busy underline-offset-2 hover:underline"
      :aria-expanded="showAll"
      @click="showAll = !showAll"
    >
      {{ showAll ? 'Hide' : 'Show' }} {{ quiet.length }} {{ quiet.length === 1 ? 'status' : 'statuses' }} with no deliveries recorded
    </button>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { clock } from '../clock.js';

const props = defineProps({
  accounts: { type: Array, required: true },
  generators: { type: Array, required: true },
  // From deliveryGrid(): by account key, then status key.
  grid: { type: Object, required: true },
  selected: { type: Object, default: null },
});

const emit = defineEmits(['select']);

const empty = { postedAt: null, failure: null };
const showAll = ref(false);

// Statuses that have never gone out (a Splatfest between Splatfests, say) are folded away,
// unless one of them is the selected cell.
const quiet = computed(() => props.generators.filter(generator =>
  !props.accounts.some(account => cell(generator, account).postedAt || cell(generator, account).failure)));

const visible = computed(() => showAll.value
  ? props.generators
  : props.generators.filter(generator => !quiet.value.includes(generator) || props.selected?.generator === generator.key));

function cell(generator, account) {
  return props.grid[account.key]?.[generator.key] ?? empty;
}

function text(generator, account) {
  let { postedAt, failure } = cell(generator, account);

  if (failure) return 'Failed';

  return postedAt ? clock.when(postedAt, false) : '–';
}

function isSelected(generator, account) {
  return props.selected?.generator === generator.key && props.selected?.account === account.key;
}
</script>
