import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('data stores in Node', () => {
  it('initializes shared stores without Vite', () => {
    const script = `
      import { createPinia, setActivePinia } from 'pinia';
      import { useDataStore } from './src/stores/data.mjs';

      setActivePinia(createPinia());
      useDataStore();
    `;

    expect(() => execFileSync(process.execPath, [
      '--input-type=module',
      '--eval',
      script,
    ], { cwd: process.cwd(), stdio: 'pipe' })).not.toThrow();
  });
});
