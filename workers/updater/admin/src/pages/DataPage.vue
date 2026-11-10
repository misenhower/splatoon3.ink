<template>
  <div v-if="data" class="flex flex-col gap-6">
    <section class="card flex flex-col gap-4" aria-label="Published data">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-lg font-semibold">
            Published data
          </h1>
          <p class="mt-0.5 text-muted">
            What <a :href="data.siteUrl" class="text-busy underline-offset-2 hover:underline" target="_blank" rel="noreferrer">{{ host }}</a> serves from the assets bucket.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" :disabled="!!store.busy" @click="verify">
            {{ store.busy === 'data:verify' ? 'Checking…' : 'Check site' }}
          </button>
          <ConfirmButton
            confirm-label="Purge cached data now?"
            :disabled="!!store.busy || !data.purgeConfigured"
            @confirmed="purge"
          >
            {{ store.busy === 'data:purge' ? 'Purging…' : 'Purge cache' }}
          </ConfirmButton>
        </div>
      </div>

      <p
        v-if="result"
        class="rounded-lg border px-3 py-2"
        :class="result.ok ? 'border-ok/40 bg-ok/10 text-ok' : 'border-bad/50 bg-bad/10 text-bad'"
        role="status"
      >
        {{ result.text }}
      </p>
      <p v-if="!data.purgeConfigured" class="text-muted">
        Cache purging is not configured for this environment.
      </p>

      <div class="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-3">
        <div
          v-for="file in watched"
          :key="file.key"
          class="flex flex-col gap-1 rounded-lg border bg-raised/60 p-4"
          :class="file.state === 'fresh' ? 'border-line' : 'border-warn/60'"
        >
          <span class="label">{{ file.label }}</span>
          <span class="text-xl font-bold tracking-tight">
            {{ file.file ? formatRelative(file.file.uploaded, now) : 'Missing' }}
          </span>
          <span :class="file.state === 'fresh' ? 'text-muted' : 'text-warn'">
            {{ file.state === 'fresh' ? 'Current' : file.state === 'stale' ? `Stale: older than ${Math.round(file.maxAgeMs / 60000)} minutes` : 'Not published yet' }}
          </span>
        </div>
      </div>
    </section>

    <section class="card flex flex-col gap-3" aria-label="Files">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="card-title">
          Files <span class="font-normal text-muted">{{ data.files.length }}</span>
        </h2>
        <div class="flex items-center gap-2">
          <label class="sr-only" for="file-search">Search files</label>
          <input
            id="file-search"
            v-model.trim="search"
            type="search"
            class="field w-56"
            placeholder="Search by name"
          />
          <button type="button" class="btn" @click="load">
            Refresh
          </button>
        </div>
      </div>

      <details
        v-for="group in groups"
        :key="group.key"
        class="border-t border-line pt-2"
        :open="!!search || open.includes(group.key)"
        @toggle="toggle(group.key, $event)"
      >
        <summary class="flex min-h-10 cursor-pointer flex-wrap items-center justify-between gap-x-4 rounded-lg px-1 hover:bg-raised">
          <span class="font-semibold">{{ group.label }} <span class="font-normal text-muted">{{ group.files.length }}</span></span>
          <span class="text-muted">
            {{ formatSize(group.size) }} · newest {{ formatRelative(group.newest, now) }}
          </span>
        </summary>

        <div class="overflow-x-auto">
          <table class="mt-1 w-full min-w-[560px] border-collapse text-left">
            <tbody>
              <tr v-for="file in group.files" :key="file.key" class="border-t border-raised">
                <td class="py-1.5 pr-3">
                  <a
                    :href="`${data.siteUrl}/${file.key}`"
                    class="font-mono text-busy underline-offset-2 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >{{ file.name }}</a>
                </td>
                <td class="px-3 py-1.5 text-right font-mono whitespace-nowrap text-muted">
                  {{ formatSize(file.size) }}
                </td>
                <td class="px-3 py-1.5 font-mono whitespace-nowrap">
                  {{ clock.when(file.uploaded) }}
                </td>
                <td class="py-1.5 pl-3 text-right whitespace-nowrap text-muted">
                  {{ formatRelative(file.uploaded, now) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>

      <p v-if="!groups.length" class="py-6 text-center text-muted">
        {{ data.files.length ? 'No files match.' : 'Nothing has been published yet.' }}
      </p>
    </section>
  </div>

  <p v-else class="py-24 text-center" :class="error ? 'text-bad' : 'text-muted'">
    {{ error ?? 'Loading published data…' }}
  </p>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { api } from '../api.js';
import { clock } from '../clock.js';
import ConfirmButton from '../components/ConfirmButton.vue';
import { formatSize, groupFiles, watchedFiles } from '../lib/data.js';
import { formatRelative } from '../lib/format.js';
import { act, store } from '../store.js';

const data = ref(null);
const error = ref(null);
const search = ref('');
const open = ref(['core']);
const result = ref(null);

// Ages count from the listing's own clock, moved along by this page's.
const now = computed(() => store.now);
const host = computed(() => data.value.siteUrl ? new URL(data.value.siteUrl).host : 'the site');
const watched = computed(() => watchedFiles(data.value.files, now.value));
const groups = computed(() => groupFiles(data.value.files, search.value));

async function load() {
  try {
    data.value = await api.data();
    error.value = null;
  } catch (failure) {
    error.value = failure.message;
  }
}

function toggle(key, event) {
  if (search.value) return;

  open.value = event.target.open ? [...new Set([...open.value, key])] : open.value.filter(candidate => candidate !== key);
}

async function verify() {
  result.value = null;

  let answer = await act('data:verify', '/data/verify', {}, null);

  if (answer) {
    result.value = answer.ok
      ? { ok: true, text: `${host.value} serves the data that is in the bucket.` }
      : { ok: false, text: answer.error };
  }
}

async function purge() {
  result.value = null;

  let answer = await act('data:purge', '/data/purge', {}, null);

  if (answer) {
    result.value = answer.ok
      ? { ok: true, text: answer.purged ? 'Cached data was purged from the edge.' : 'Cache purging is not configured, so nothing was purged.' }
      : { ok: false, text: answer.error };
  }
}

let timer = null;

onMounted(() => {
  load();
  timer = setInterval(() => document.hidden || load(), 30_000);
});

onBeforeUnmount(() => clearInterval(timer));
</script>
