import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// The Worker's static assets directory must exist; tests do not need the built admin app.
mkdirSync(fileURLToPath(new URL('./admin/dist', import.meta.url)), { recursive: true });

export default defineConfig({
  plugins: [
    cloudflareTest({
      // Browser captures and SplatNet are mocked; tests never use remote services.
      remoteBindings: false,
      miniflare: {
        bindings: {
          RUN_TOKEN: 'test-run-token',
          TOKEN_UPLOAD_TOKEN: 'test-upload-token',
          NINTENDO_TOKEN_US: 'session-token-us-12345678',
          NXAPI_CLIENT_ID: 'client',
          NXAPI_SHARED_SECRET: 'secret',
        },
        // The archive compressor Worker the COMPRESSOR binding points at, without its container.
        workers: [{
          name: 'splatoon3-ink-dev-compressor',
          modules: true,
          scriptPath: fileURLToPath(new URL('./test/fakeCompressor.mjs', import.meta.url)),
          compatibilityDate: '2026-09-03',
          durableObjects: { COMPRESSOR: 'Compressor' },
        }],
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
