<template>
  <select @change="onLanguageChange" v-model="$i18n.locale" class="language font-splatoon2 md:absolute md:mb-0 mb-5">
    <option v-for="locale in $i18n.availableLocales" :key="`locale-${locale}`" :value="locale">{{ $t('locales.' + locale) }}</option>
  </select>
</template>

<script setup>
  import { useI18n } from "vue-i18n"
  const i18n = useI18n()

  const onLanguageChange = () => {
    localStorage.setItem('lang', i18n.locale.value)
  }
</script>

<style scoped>
.language {
  right: 2.5vw;
  @apply text-zinc-300 pl-4 py-1 bg-zinc-300 bg-opacity-20 rounded-full cursor-pointer
}

.language:hover {
  @apply text-zinc-50 bg-opacity-30;
}

.language option {
  @apply text-black
}
</style>
