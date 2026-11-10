<template>
  <div v-if="social" class="flex flex-col gap-6">
    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <PostLog :posts="social.posts" @select="select" />
      <AccountsCard :accounts="social.accounts" :failures="failures" />
    </div>

    <DeliveryGrid
      :accounts="social.accounts"
      :generators="social.generators"
      :grid="grid"
      :selected="selection"
      @select="select"
    />

    <PostComposer
      v-if="selected"
      ref="composer"
      :generator="selected.generator"
      :account="selected.account"
      :cell="selected.cell"
      :accounts="social.accounts"
    />
    <p v-else class="card text-center text-muted">
      Select a cell above to preview a status and post it by hand.
    </p>
  </div>

  <p v-else class="py-24 text-center" :class="store.socialError ? 'text-bad' : 'text-muted'">
    {{ store.socialError ?? 'Loading accounts and posts…' }}
  </p>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AccountsCard from '../components/AccountsCard.vue';
import DeliveryGrid from '../components/DeliveryGrid.vue';
import PostComposer from '../components/PostComposer.vue';
import PostLog from '../components/PostLog.vue';
import { deliveryGrid } from '../lib/social.js';
import { refreshSocial, store } from '../store.js';

const route = useRoute();
const router = useRouter();
const composer = ref(null);

const social = computed(() => store.social);
const grid = computed(() => deliveryGrid(social.value.lastPosted, social.value.posts));

const failures = computed(() => Object.fromEntries(Object.entries(grid.value)
  .map(([account, cells]) => [account, Object.values(cells).filter(cell => cell.failure).length])));

// The selected cell lives in the address (?status=schedules&account=bluesky).
const selection = computed(() => route.query.status && route.query.account
  ? { generator: route.query.status, account: route.query.account }
  : null);

const selected = computed(() => {
  let generator = social.value.generators.find(candidate => candidate.key === selection.value?.generator);
  let account = social.value.accounts.find(candidate => candidate.key === selection.value?.account);

  if (!generator || !account) return null;

  return { generator, account, cell: grid.value[account.key]?.[generator.key] ?? { postedAt: null, failure: null } };
});

async function select({ generator, account }) {
  await router.replace({ query: { status: generator, account } });
  await nextTick();
  composer.value?.$el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

let timer = null;

onMounted(() => {
  refreshSocial();
  timer = setInterval(() => document.hidden || refreshSocial(), 30_000);
});

onBeforeUnmount(() => clearInterval(timer));
</script>
