// The admin panel is its own small Vue app, separate from the public site's bundle. It builds
// to admin/dist, which the updater Worker serves behind Cloudflare Access (see ../wrangler.jsonc).
//
// `npm run admin:dev` serves it with a simulated API (mock/api.mjs): no Worker, no credentials.

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { createMockApi } from './mock/api.mjs';

function mockApi() {
  return {
    name: 'admin-mock-api',
    apply: 'serve',
    configureServer(server) {
      let api = createMockApi();

      server.middlewares.use('/admin/api', async (request, response) => {
        let chunks = [];

        for await (let chunk of request) {
          chunks.push(chunk);
        }

        let body = null;

        try {
          body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null;
        } catch {
          // Leave the body empty; the handler rejects it.
        }

        let url = new URL(request.url, 'http://localhost');
        let result = api.handle(request.method, url.pathname, url.searchParams, body);

        response.writeHead(result.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify(result.body));
      });
    },
  };
}

export default defineConfig({
  root: import.meta.dirname,
  plugins: [vue(), tailwindcss(), mockApi()],
  server: { port: 5180, strictPort: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
