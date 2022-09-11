import { resolve } from 'path'
import { fileURLToPath, URL } from 'url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const redirectToDist = [
  '/assets/splatnet/',
  '/data/',
];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
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
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        screenshots: resolve(__dirname, 'screenshots/index.html')
      }
    }
  }
})
