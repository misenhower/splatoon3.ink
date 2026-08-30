import { resolve } from 'path';
import { fileURLToPath, URL } from 'url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';

const redirectToDist = [
  '/assets/splatnet/',
  '/data/',
];

// https://vitejs.dev/config/
export default defineConfig({
  input: {
    main: resolve(import.meta.dirname, 'index.html'),
    screenshots: resolve(import.meta.dirname, 'screenshots/index.html'),
  },
  plugins: [
    vue(),
    tailwindcss(),
    VueI18nPlugin({
      include: resolve(import.meta.dirname, './src/assets/i18n/*.json'),
    }),
    {
      // Quick hack to redirect dynamic assets to the /dist/ directory
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (redirectToDist.some(s => req.url.startsWith(s))) {
            req.url = '/dist' + req.url;
          }

          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    emptyOutDir: false,
  },
});
