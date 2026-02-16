import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies that ImageProcessor imports but we don't need for pure method tests
vi.mock('p-queue', () => ({ default: class { add(fn) { return fn(); } onIdle() {} } }));
vi.mock('../common/prefixedConsole.mjs', () => ({ default: () => ({ info: vi.fn(), error: vi.fn() }) }));
vi.mock('../common/fs.mjs', () => ({ exists: vi.fn(), mkdirp: vi.fn() }));
vi.mock('fs/promises', () => ({ default: { writeFile: vi.fn() } }));

const { default: ImageProcessor } = await import('./ImageProcessor.mjs');

describe('ImageProcessor', () => {
  let processor;

  beforeEach(() => {
    delete process.env.SITE_URL;
    processor = new ImageProcessor();
  });

  describe('normalize', () => {
    it('delegates to normalizeSplatnetResourcePath', () => {
      const result = processor.normalize('https://api.lp1.av5ja.srv.nintendo.net/resources/prod/v2/weapon/image.png');
      expect(result).toBe('v2/weapon/image.png');
    });
  });

  describe('localPath', () => {
    it('returns dist/assets/splatnet/{file}', () => {
      expect(processor.localPath('v2/weapon/image.png')).toBe('dist/assets/splatnet/v2/weapon/image.png');
    });
  });

  describe('publicUrl', () => {
    it('returns /{outputDirectory}/{file} without SITE_URL', () => {
      expect(processor.publicUrl('v2/weapon/image.png')).toBe('/assets/splatnet/v2/weapon/image.png');
    });

    it('prepends SITE_URL when set', () => {
      process.env.SITE_URL = 'https://splatoon3.ink';
      const proc = new ImageProcessor();
      expect(proc.publicUrl('v2/weapon/image.png')).toBe('https://splatoon3.ink/assets/splatnet/v2/weapon/image.png');
    });
  });
});
