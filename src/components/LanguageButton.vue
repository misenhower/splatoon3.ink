<template>
  <select @change="onLanguageChange" v-model="$i18n.locale" class="bg-transparent text-zinc-300 cursor-pointer">
    <template v-for="locale in $i18n.availableLocales" :key="locale">
      <option :value="locale">{{ $t('locales.' + locale) }}</option>
    </template>
  </select>
</template>

<script setup>
import { useI18n } from "vue-i18n"
const i18n = useI18n()

const onLanguageChange = () => {
  localStorage.setItem('lang', i18n.locale.value)
}
</script>
