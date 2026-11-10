<template>
  <section class="card flex flex-col gap-4 border-accent/60" aria-label="Selected status">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="card-title">
        {{ generator.name }} <span class="font-normal text-muted">on</span> {{ account.name }}
      </h2>
      <span class="font-mono text-muted">{{ generator.key }} · {{ account.locale }}</span>
    </div>

    <p v-if="cell.failure" class="rounded-lg border border-bad/50 bg-bad/10 px-3 py-2 text-bad">
      Failed at {{ clock.when(cell.failure.at) }}: {{ cell.failure.error }}
    </p>
    <p v-else-if="cell.postedAt" class="text-muted">
      Last posted at <span class="font-mono text-ink">{{ clock.when(cell.postedAt) }}</span>.
    </p>
    <p v-else class="text-muted">
      No delivery recorded for this account.
    </p>

    <div class="flex flex-wrap gap-5">
      <div class="flex min-w-0 flex-[1_1_20rem] flex-col gap-2">
        <template v-if="preview">
          <img
            v-for="(media, index) in preview.media"
            :key="index"
            :src="media.url"
            :alt="media.altText ?? ''"
            class="w-full rounded-lg border border-line"
          />
        </template>
        <div v-else class="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-line bg-raised px-4 text-center text-muted">
          {{ loading ? 'Rendering from the published data…' : error ?? 'No preview rendered yet.' }}
        </div>
      </div>

      <div class="flex min-w-0 flex-[2_1_22rem] flex-col gap-3">
        <template v-if="preview">
          <p class="rounded-lg bg-ground p-3 whitespace-pre-line">
            {{ preview.text }}
          </p>
          <p v-if="preview.contentWrapper" class="text-muted">
            Content warning: {{ preview.contentWrapper }}
          </p>
          <details v-if="preview.media.some(media => media.altText)" class="text-muted">
            <summary class="cursor-pointer">
              Image description
            </summary>
            <p v-for="(media, index) in preview.media" :key="index" class="mt-2 whitespace-pre-line">
              {{ media.altText }}
            </p>
          </details>
        </template>

        <p class="text-muted">
          The preview is rendered from the data published right now, so it shows what would be posted, which may differ from what went out earlier.
        </p>

        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" :disabled="loading || posting" @click="render">
            {{ loading ? 'Rendering…' : preview ? 'Render again' : 'Render preview' }}
          </button>
          <ConfirmButton
            variant="primary"
            :confirm-label="`Post publicly to ${account.name}?`"
            :disabled="!canPost"
            @confirmed="post([account])"
          >
            Post to {{ account.name }}
          </ConfirmButton>
          <ConfirmButton
            v-if="others.length"
            :confirm-label="`Post publicly to ${everyone.length} accounts?`"
            :disabled="!preview || posting || loading"
            @confirmed="post(everyone)"
          >
            Post to all {{ everyone.length }} {{ languages[account.locale] ?? account.locale }} accounts
          </ConfirmButton>
        </div>

        <p v-if="blocked" class="text-warn">
          {{ blocked }}
        </p>
        <p v-else-if="!preview" class="text-muted">
          Render a preview before each post. Posting is public and cannot be undone from here.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { api } from '../api.js';
import { clock } from '../clock.js';
import { act, refreshSocial, showToast, store } from '../store.js';
import ConfirmButton from './ConfirmButton.vue';

const props = defineProps({
  generator: { type: Object, required: true },
  account: { type: Object, required: true },
  cell: { type: Object, required: true },
  accounts: { type: Array, required: true },
});

const languages = { 'en-US': 'English', 'ja-JP': 'Japanese' };

const preview = ref(null);
const loading = ref(false);
const error = ref(null);

const posting = computed(() => store.busy === 'social:post');

// The accounts in this account's language that can take a post right now.
const everyone = computed(() => props.accounts
  .filter(candidate => candidate.locale === props.account.locale && candidate.enabled && candidate.configured));
const others = computed(() => everyone.value.filter(candidate => candidate.key !== props.account.key));

const blocked = computed(() => {
  if (!props.account.configured) return `${props.account.name} has no credentials in this environment.`;
  if (!props.account.enabled) return `Posting is turned off for ${props.account.name}.`;

  return null;
});

const canPost = computed(() => !!preview.value && !blocked.value && !posting.value && !loading.value);

// A preview belongs to one status in one language; anything else starts over.
watch(() => `${props.generator.key}:${props.account.locale}`, () => {
  preview.value = null;
  error.value = null;
});

async function render() {
  let key = `${props.generator.key}:${props.account.locale}`;

  loading.value = true;
  error.value = null;

  try {
    let result = await api.post('/social/preview', { generator: props.generator.key, locale: props.account.locale });

    if (key === `${props.generator.key}:${props.account.locale}`) {
      preview.value = result;
    }
  } catch (failure) {
    preview.value = null;
    error.value = failure.message;
  } finally {
    loading.value = false;
  }
}

async function post(accounts) {
  let result = await act('social:post', '/social/post', {
    generator: props.generator.key,
    clients: accounts.map(account => account.key),
  }, null);

  if (result) {
    let failed = result.events.filter(event => event.type === 'error');
    let posted = result.events.filter(event => event.type === 'posted');

    if (failed.length) {
      showToast(`${props.generator.name}: ${failed[0].error}${failed.length > 1 ? ` (and ${failed.length - 1} more)` : ''}`, 'error');
    } else {
      showToast(`Posted ${props.generator.name} to ${posted.map(event => event.client.name).join(', ')}.`);
    }

    // Posting again takes a fresh preview, so a double press cannot post twice.
    preview.value = null;
  }

  await refreshSocial();
}
</script>
