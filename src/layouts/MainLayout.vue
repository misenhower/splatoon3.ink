<template>
  <main class="min-h-screen flex flex-col overflow-hidden">
    <div class="flex flex-col md:flex-row space-y-2 md:space-y-0 justify-between items-center mx-4 my-4 md:mx-12 z-10">
      <div class="font-splatoon1 text-5xl text-shadow-lg">
        <router-link to="/">
          Splatoon 3
        </router-link>
      </div>

      <div v-if="props.title" class="justify-end font-splatoon2 text-3xl text-zinc-200">
        {{ props.title }}
      </div>
    </div>

    <div class="flex mx-4 md:mx-12 justify-center md:justify-end mb-4">
      <NavButtons />
    </div>

    <slot />

    <div class="m-2 text-center text-xs text-zinc-500">
      <div>
        <img src="@/assets/img/little-buddy.png" class="mx-auto mb-4" width="50" />
      </div>
      <div>
        {{ $t('footer.term') }}
      </div>
      <div class="footer-links">
        <router-link to="/about">
          <span>{{ $t('footer.about') }}</span>
        </router-link>
        &ndash;
        <router-link to="/socials">
          <span>{{ $t('footer.socials') }}</span>
        </router-link>
        &ndash;
        <a href="https://github.com/misenhower/splatoon3.ink/wiki/Data-Access" target="_blank">
          <span>{{ $t('footer.data') }}</span>
        </a>
        &ndash;
        <a href="https://splatoon2.ink" target="_blank">
          <span>splatoon2.ink</span>
        </a>
        &ndash;
        <a href="https://github.com/misenhower/splatoon3.ink" target="_blank">
          <span>GitHub</span>
        </a>
        &ndash;
        <LanguageButton />
      </div>
    </div>

    <TimeOffsetSelector v-if="isDev" class="mb-4" />
  </main>
</template>

<script setup>
import NavButtons from '@/components/NavButtons.vue';
import LanguageButton from '@/components/LanguageButton.vue';
import TimeOffsetSelector from '@/components/Debug/TimeOffsetSelector.vue';

const props = defineProps({
  title: String,
});

const isDev = import.meta.env.DEV;
</script>

<style scoped>
.footer-links a span {
  @apply text-zinc-300;
}

.footer-links a:hover span {
  @apply text-white underline;
}
</style>
