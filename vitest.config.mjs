import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: [
      'app/**/*.test.mjs',
      'src/**/*.test.{js,mjs}',
    ],
  },
});
