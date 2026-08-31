import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('NsoClient', () => {
  it('loads the nxapi authentication integration in Node', () => {
    expect(() => execFileSync(process.execPath, [
      '--input-type=module',
      '--eval',
      'await import(\'./app/splatnet/NsoClient.mjs\')',
    ], { cwd: process.cwd() })).not.toThrow();
  });
});
