<template>
  <div class="grow flex items-start justify-center" :aria-busy="!ready && !failed">
    <slot v-if="ready" />

    <div v-else class="mx-4 md:mx-12 w-full">
      <div v-if="failed" class="min-h-[32rem] flex items-center justify-center">
        <div role="alert" class="rounded-2xl bg-zinc-800/90 p-8 text-center space-y-4 max-w-md">
          <p class="font-splatoon2 text-lg">
            {{ $t('loading.error') }}
          </p>
          <button class="rounded-full bg-splatoon-blue px-5 py-2 font-splatoon2 hover:bg-splatoon-purple focus-visible:outline-2 focus-visible:outline-offset-4" @click="retry">
            {{ $t('loading.retry') }}
          </button>
        </div>
      </div>

      <template v-else>
        <p role="status" class="sr-only">
          {{ $t('loading.label') }}
        </p>
        <PageSkeleton :variant="variant" aria-hidden="true" />
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import PageSkeleton from './PageSkeleton.vue';

const props = defineProps({
  sources: { type: Array, required: true },
  variant: { type: String, required: true },
});

const ready = computed(() => props.sources.every(source => source.data !== null));
const failed = computed(() => props.sources.some(source => source.data === null && source.error));

function retry() {
  for (const source of props.sources) {
    if (source.data === null) source.update();
  }
}
</script>
