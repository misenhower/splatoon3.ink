import { fileURLToPath } from 'node:url';
import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      // Browser captures and SplatNet are mocked; tests never use remote services.
      remoteBindings: false,
      miniflare: {
        bindings: {
          RUN_TOKEN: 'test-run-token',
          NINTENDO_TOKEN_US: 'session-token-us-12345678',
          NXAPI_CLIENT_ID: 'client',
          NXAPI_SHARED_SECRET: 'secret',
        },
      },
      wrangler: {
        environment: 'dev',
        configPath: fileURLToPath(new URL('./wrangler.jsonc', import.meta.url)),
      },
    }),
  ],
  test: {
    include: ['workers/updater/**/*.spec.mjs'],
  },
});
