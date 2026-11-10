import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { testBuckets } from '../test/storage.mjs';

// Mock dependencies that ImageProcessor imports but we don't need for pure method tests
vi.mock('p-queue', () => ({ default: class { add(fn) { return fn(); } onIdle() {} } }));
vi.mock('../common/prefixedConsole.mjs', () => ({ default: () => ({ info: vi.fn(), error: vi.fn() }) }));

const { default: ImageProcessor } = await import('./ImageProcessor.mjs');
const { default: RunLimits } = await import('./RunLimits.mjs');

describe('ImageProcessor', () => {
  let processor;

  beforeEach(() => {
    delete process.env.SITE_URL;
    delete process.env.ASSET_URL;
    processor = new ImageProcessor();
  });

  describe('normalize', () => {
    it('delegates to normalizeSplatnetResourcePath', () => {
      const result = processor.normalize('https://api.lp1.av5ja.srv.nintendo.net/resources/prod/v2/weapon/image.png');
      expect(result).toBe('v2/weapon/image.png');
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('storageKey', () => {
    it('returns the public storage key splatnet/{file}', () => {
      expect(processor.storageKey('v2/weapon/image.png')).toBe('splatnet/v2/weapon/image.png');
    });
  });

  describe('process', () => {
    it('downloads a new image into public storage', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]))));

      await processor.process('https://api.lp1.av5ja.srv.nintendo.net/resources/prod/v2/a.png', false);

      expect(fetch).toHaveBeenCalledOnce();
      expect(testBuckets().public.objects.get('splatnet/v2/a.png').httpMetadata.contentType).toBe('image/png');
      expect([...testBuckets().public.objects.get('splatnet/v2/a.png').bytes]).toEqual([1, 2, 3]);
    });

    it('skips images that are already stored', async () => {
      vi.stubGlobal('fetch', vi.fn());
      await testBuckets().public.put('splatnet/v2/a.png', new Uint8Array([1]));

      await processor.process('https://api.lp1.av5ja.srv.nintendo.net/resources/prod/v2/a.png', false);

      expect(fetch).not.toHaveBeenCalled();
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

    it('uses the canonical asset host when ASSET_URL is set', () => {
      process.env.SITE_URL = 'https://splatoon3.ink';
      process.env.ASSET_URL = 'https://assets.splatoon3.ink/';
      const proc = new ImageProcessor();
      expect(proc.publicUrl('v2/weapon/image.png')).toBe('https://assets.splatoon3.ink/splatnet/v2/weapon/image.png');
    });
  });

  describe('maybeDownload', () => {
    it('downloads an image once when requested concurrently in the same run', async () => {
      const limits = new RunLimits;
      processor = new ImageProcessor(limits);
      const download = vi.spyOn(processor, 'download').mockResolvedValue();
      const other = new ImageProcessor(limits);
      vi.spyOn(other, 'download').mockImplementation(download);

      await Promise.all([
        processor.maybeDownload('https://example.com/a.png', 'a.png'),
        other.maybeDownload('https://example.com/a.png', 'a.png'),
        processor.maybeDownload('https://example.com/b.png', 'b.png'),
      ]);

      expect(download).toHaveBeenCalledTimes(2);
    });

    it('checks again once an earlier download has finished', async () => {
      const download = vi.spyOn(processor, 'download').mockResolvedValue();

      await processor.maybeDownload('https://example.com/c.png', 'c.png');
      await processor.maybeDownload('https://example.com/c.png', 'c.png');

      expect(download).toHaveBeenCalledTimes(2);
    });
  });
});
