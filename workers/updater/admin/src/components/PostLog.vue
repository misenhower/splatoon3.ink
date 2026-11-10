<template>
  <section class="card flex min-w-0 flex-col gap-3" aria-label="Post log">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-lg font-semibold">
        Post log
      </h1>
      <div class="segmented" role="group" aria-label="Filter the post log">
        <button
          v-for="option in filters"
          :key="option.key"
          type="button"
          :aria-pressed="filter === option.key"
          @click="filter = option.key"
        >
          {{ option.label }}{{ option.key === 'error' && errorCount ? ` (${errorCount})` : '' }}
        </button>
      </div>
    </div>

    <div class="flex max-h-[34rem] flex-col overflow-y-auto">
      <div
        v-for="group in visible"
        :key="group.key"
        class="grid grid-cols-[auto_4.5rem_1fr] items-baseline gap-x-4 gap-y-1 border-t border-raised py-2.5 sm:grid-cols-[auto_4.5rem_1fr_auto]"
      >
        <span class="font-mono text-muted">{{ clock.when(group.at) }}</span>
        <span class="font-semibold" :class="group.type === 'error' ? 'text-bad' : 'text-ok'">
          {{ group.type === 'error' ? 'Error' : 'Posted' }}
        </span>
        <span class="flex min-w-0 flex-col">
          <span>
            {{ describeGroup(group) }}
            <span v-if="group.manual" class="ml-1 rounded-sm bg-raised px-1.5 py-px text-xs text-muted">by hand</span>
          </span>
          <span v-if="group.error" class="font-mono text-[13px] break-words text-bad">{{ group.error }}</span>
          <span v-else-if="group.clients.length > 1" class="text-[13px] text-muted">
            {{ group.clients.map(client => client.name).join(', ') }}
          </span>
        </span>
        <span class="col-start-3 flex flex-wrap gap-x-4 sm:col-start-4">
          <button
            v-if="group.type === 'error' && group.clients.length"
            type="button"
            class="text-busy underline-offset-2 hover:underline"
            @click="emit('select', { generator: group.generator.key, account: group.clients[0].key })"
          >
            Preview and retry
          </button>
          <RouterLink
            v-if="group.runId"
            :to="{ name: 'timeline', query: { run: `fast:${group.runId}` } }"
            class="text-busy underline-offset-2 hover:underline"
          >
            Open run
          </RouterLink>
        </span>
      </div>

      <p v-if="!visible.length" class="py-8 text-center text-muted">
        {{ groups.length ? 'Nothing matches this filter.' : 'Nothing has been posted since this log began.' }}
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { clock } from '../clock.js';
import { describeGroup, groupPosts } from '../lib/social.js';

const props = defineProps({
  posts: { type: Array, required: true },
});

const emit = defineEmits(['select']);

const filters = [
  { key: 'all', label: 'All' },
  { key: 'posted', label: 'Posted' },
  { key: 'error', label: 'Errors' },
];

const filter = ref('all');
const groups = computed(() => groupPosts(props.posts));
const errorCount = computed(() => groups.value.filter(group => group.type === 'error').length);
const visible = computed(() => groups.value.filter(group => filter.value === 'all' || group.type === filter.value));
</script>
