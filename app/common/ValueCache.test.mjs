import { describe, it, expect, beforeEach } from 'vitest';
import ValueCache from './ValueCache.mjs';
import { testBuckets } from '../test/storage.mjs';

describe('ValueCache', () => {
  let cache;

  function store(item) {
    return testBuckets().private.put('cache/test-key.json', JSON.stringify(item));
  }

  beforeEach(() => {
    cache = new ValueCache('test-key');
  });

  describe('path', () => {
    it('returns the private storage key cache/{key}.json', () => {
      expect(cache.path).toBe('cache/test-key.json');
      expect(new ValueCache('other').path).toBe('cache/other.json');
    });
  });

  describe('get', () => {
    it('returns the item when valid and not expired', async () => {
      const item = { data: 'hello', expires: Date.now() + 60000, cachedAt: new Date().toISOString() };
      await store(item);
      expect(await cache.get()).toEqual(item);
    });

    it('returns null when expired', async () => {
      await store({ data: 'hello', expires: Date.now() - 60000, cachedAt: new Date().toISOString() });
      expect(await cache.get()).toBeNull();
    });

    it('treats an expiry stored as a date string the same way', async () => {
      await store({ data: 'hello', expires: new Date(Date.now() - 60000).toISOString() });
      expect(await cache.get()).toBeNull();
    });

    it('returns item when no expiry is set', async () => {
      const item = { data: 'hello', expires: null, cachedAt: new Date().toISOString() };
      await store(item);
      expect(await cache.get()).toEqual(item);
    });

    it('returns null when missing or unreadable', async () => {
      expect(await cache.get()).toBeNull();

      await testBuckets().private.put('cache/test-key.json', 'not json');
      expect(await cache.get()).toBeNull();
    });
  });

  describe('getData', () => {
    it('returns .data field from cached item', async () => {
      await store({ data: { foo: 'bar' }, expires: Date.now() + 60000 });
      expect(await cache.getData()).toEqual({ foo: 'bar' });
    });

    it('returns null when no cache', async () => {
      expect(await cache.getData()).toBeNull();
    });
  });

  describe('getCachedAt', () => {
    it('returns Date from cachedAt field, even when expired', async () => {
      const cachedAt = '2024-06-15T10:00:00.000Z';
      await store({ data: 'x', expires: 1, cachedAt });
      expect(await cache.getCachedAt()).toEqual(new Date(cachedAt));
    });

    it('returns null when no data', async () => {
      expect(await cache.getCachedAt()).toBeNull();
    });
  });

  describe('setData', () => {
    it('writes readable JSON with data, expires, and cachedAt', async () => {
      const expires = Date.now() + 60000;

      await cache.setData({ key: 'value' }, expires);

      expect(testBuckets().private.text('cache/test-key.json')).toContain('"key": "value"');
      const written = testBuckets().private.json('cache/test-key.json');
      expect(written.data).toEqual({ key: 'value' });
      expect(written.expires).toBe(expires);
      expect(written.cachedAt).toBeDefined();
      expect(await cache.getData()).toEqual({ key: 'value' });
    });

    it('stores null expires when not specified', async () => {
      await cache.setData('test');

      expect(testBuckets().private.json('cache/test-key.json').expires).toBeNull();
    });
  });
});
