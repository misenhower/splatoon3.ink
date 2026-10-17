import { createApp } from 'vue';
import { createPinia } from 'pinia';

import { initializeI18n, waitForLocale } from './common/i18n';

import App from './App.vue';
import router from './router/screenshots';

const params = new URLSearchParams(window.location.hash.split('?')[1]);
const locale = params.get('locale') || 'en-US';
const i18n = initializeI18n({
  locale,
  timeZone: locale === 'ja-JP' ? 'Asia/Tokyo' : null,
  strict: locale === 'ja-JP',
});

const fixedTime = params.has('time') ? Number(params.get('time')) : undefined;
const app = createApp(App, { fixedTime });

app.use(i18n);
app.use(createPinia());
app.use(router);

waitForLocale()
  .then(() => app.mount('#app'))
  .catch(error => {
    if (locale === 'ja-JP') {
      document.documentElement.dataset.screenshotError = error.message;
    } else {
      app.mount('#app');
    }
  });
