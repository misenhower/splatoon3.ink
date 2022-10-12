import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'

import languages from './assets/i18n'

import App from './App.vue'
import router from './router'

const i18n = createI18n({
  locale: localStorage.getItem('lang') || navigator.language,
  fallbackLocale: 'en-US',
  messages: Object.assign(languages)
})

const app = createApp(App)

app.use(i18n)
app.use(createPinia())
app.use(router)

app.mount('#app')
