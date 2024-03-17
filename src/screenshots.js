import { createApp } from 'vue';
import { createPinia } from 'pinia';

import { initializeI18n } from './common/i18n';

import App from './App.vue';
import router from './router/screenshots';

const i18n = initializeI18n();

const app = createApp(App);

app.use(i18n);
app.use(createPinia());
app.use(router);

app.mount('#app');
