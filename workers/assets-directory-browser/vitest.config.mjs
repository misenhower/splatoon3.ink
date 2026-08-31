import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: './workers/assets-directory-browser/wrangler.jsonc',
      },
    }),
  ],
  test: {
    include: ['workers/assets-directory-browser/src/**/*.test.mjs'],
  },
});
