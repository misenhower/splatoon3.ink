<template>
  <select v-model="currentLanguage" class="bg-transparent text-zinc-300 cursor-pointer">
    <template v-for="locale in locales" :key="locale.code">
      <option :value="locale.code">{{ locale.flag }} {{ locale.name }}</option>
    </template>
  </select>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n"
import { locales, setPreferredLocale } from '@/common/i18n';

const i18n = useI18n();

const currentLanguage = computed({
  get() { return i18n.locale.value; },
  set(value) { setPreferredLocale(value); },
});
</script>
