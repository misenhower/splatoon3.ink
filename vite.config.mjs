import { resolve } from 'path';
import { fileURLToPath, URL } from 'url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import { createRoutes } from './src/router/routes.mjs';
import { createRedirects } from './src/router/redirects.mjs';

const redirectToDist = [
  '/assets/splatnet/',
  '/data/',
];

// https://vitejs.dev/config/
export default defineConfig({
  input: {
    main: resolve(import.meta.dirname, 'index.html'),
    notFound: resolve(import.meta.dirname, '404.html'),
    screenshots: resolve(import.meta.dirname, 'screenshots/index.html'),
  },
  plugins: [
    vue(),
    tailwindcss(),
    VueI18nPlugin({
      include: resolve(import.meta.dirname, './src/assets/i18n/*.json'),
    }),
    {
      name: 'page-metadata',
      generateBundle() {
        const routes = createRoutes();
        const urls = routes
          .filter(route => !route.redirect && !route.path.includes(':') && route.meta?.sitemap !== false)
          .map(route => {
            const url = new URL(route.path, 'https://splatoon3.ink').href
              .replaceAll('&', '&amp;')
              .replaceAll('<', '&lt;')
              .replaceAll('>', '&gt;');

            return `  <url>\n    <loc>${url}</loc>\n  </url>`;
          });

        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            ...urls,
            '</urlset>\n',
          ].join('\n'),
        });

        this.emitFile({
          type: 'asset',
          fileName: '_redirects',
          source: createRedirects(routes),
        });
      },
    },
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
