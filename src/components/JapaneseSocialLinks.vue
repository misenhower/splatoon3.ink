<template>
  <div v-if="locale === 'ja-JP'" class="flex items-center gap-2 md:mr-auto">
    <span class="-rotate-6 rounded-sm bg-splatoon-yellow px-2 py-1 font-splatoon2 text-xs text-black shadow-sm">
      NEW!
    </span>
    <a
      href="https://twitter.com/Splatoon3inkJP"
      target="_blank"
      rel="noopener noreferrer"
      class="follow-button"
    >
      {{ $t('social.followX') }}
    </a>
    <a
      href="https://bsky.app/profile/jp.splatoon3.ink"
      target="_blank"
      rel="noopener noreferrer"
      class="follow-button"
    >
      <img src="@/assets/img/bluesky-white.svg" alt="" class="h-4 w-4" />
      {{ $t('social.followBluesky') }}
    </a>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();
</script>

<style scoped>
@reference "@/assets/css/base.css";

.follow-button {
  @apply inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-1 font-splatoon2 text-zinc-300 bg-zinc-300/20 whitespace-nowrap;
  @apply focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-splatoon-yellow;
}

.follow-button:hover {
  @apply text-zinc-50 bg-zinc-300/30;
}
</style>
