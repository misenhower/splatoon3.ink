import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

const fs = (await import('fs/promises')).default;

const { default: ValueCache } = await import('./ValueCache.mjs');

describe('ValueCache', () => {
  let cache;

  beforeEach(() => {
    cache = new ValueCache('test-key');
    vi.clearAllMocks();
  });

  describe('path', () => {
    it('returns storage/cache/{key}.json', () => {
      expect(cache.path).toBe('storage/cache/test-key.json');
    });

    it('uses the key from constructor', () => {
      const other = new ValueCache('other');
      expect(other.path).toBe('storage/cache/other.json');
    });
  });

  describe('get', () => {
    it('returns parsed JSON when valid and not expired', async () => {
      const item = { data: 'hello', expires: Date.now() + 60000, cachedAt: new Date().toISOString() };
      fs.readFile.mockResolvedValue(JSON.stringify(item));
      const result = await cache.get();
      expect(result).toEqual(item);
    });

    it('returns null when expired', async () => {
      const item = { data: 'hello', expires: Date.now() - 60000, cachedAt: new Date().toISOString() };
      fs.readFile.mockResolvedValue(JSON.stringify(item));
      expect(await cache.get()).toBeNull();
    });

    it('returns item when no expiry is set', async () => {
      const item = { data: 'hello', expires: null, cachedAt: new Date().toISOString() };
      fs.readFile.mockResolvedValue(JSON.stringify(item));
      const result = await cache.get();
      expect(result).toEqual(item);
    });

    it('returns null when file is missing', async () => {
      fs.readFile.mockRejectedValue(new Error('ENOENT'));
      expect(await cache.get()).toBeNull();
    });
  });

  describe('getData', () => {
    it('returns .data field from cached item', async () => {
      const item = { data: { foo: 'bar' }, expires: Date.now() + 60000, cachedAt: new Date().toISOString() };
      fs.readFile.mockResolvedValue(JSON.stringify(item));
      expect(await cache.getData()).toEqual({ foo: 'bar' });
    });

    it('returns null when no cache', async () => {
      fs.readFile.mockRejectedValue(new Error('ENOENT'));
      expect(await cache.getData()).toBeNull();
    });
  });

  describe('getCachedAt', () => {
    it('returns Date from cachedAt field', async () => {
      const cachedAt = '2024-06-15T10:00:00.000Z';
      const item = { data: 'x', cachedAt };
      fs.readFile.mockResolvedValue(JSON.stringify(item));
      const result = await cache.getCachedAt();
      expect(result).toEqual(new Date(cachedAt));
    });

    it('returns null when no data', async () => {
      fs.readFile.mockRejectedValue(new Error('ENOENT'));
      expect(await cache.getCachedAt()).toBeNull();
    });
  });

  describe('setData', () => {
    it('writes JSON with data, expires, and cachedAt', async () => {
      fs.mkdir.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);

      await cache.setData({ key: 'value' }, Date.now() + 60000);

      expect(fs.mkdir).toHaveBeenCalledWith('storage/cache', { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        'storage/cache/test-key.json',
        expect.stringContaining('"key": "value"'),
      );

      const written = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(written.data).toEqual({ key: 'value' });
      expect(written.expires).toBeDefined();
      expect(written.cachedAt).toBeDefined();
    });

    it('passes null expires when not specified', async () => {
      fs.mkdir.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);

      await cache.setData('test');

      const written = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(written.expires).toBeNull();
    });
  });
});
