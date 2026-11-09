import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BucketStorage, MemoryBucket, configureStorage, storage } from './index.mjs';
import { filesystemStorage } from './filesystem.mjs';

describe('BucketStorage', () => {
  let bucket;
  let store;

  beforeEach(() => {
    bucket = new MemoryBucket;
    store = new BucketStorage(bucket);
  });

  it('reads and writes JSON documents, returning null when missing', async () => {
    expect(await store.readJson('data/gear.json')).toBeNull();

    await store.writeText('data/gear.json', JSON.stringify({ a: 1 }));

    expect(await store.readJson('data/gear.json')).toEqual({ a: 1 });
  });

  it('applies content types and data cache headers', async () => {
    await store.writeText('data/festivals.US.ics', 'BEGIN:VCALENDAR');
    await store.writeBytes('splatnet/v3/a.png', new Uint8Array([1]));

    expect(bucket.objects.get('data/festivals.US.ics').httpMetadata).toEqual({
      contentType: 'text/calendar',
      cacheControl: 'no-cache, stale-while-revalidate=5, stale-if-error=86400',
    });
    expect(bucket.objects.get('splatnet/v3/a.png').httpMetadata).toEqual({
      contentType: 'image/png',
      cacheControl: undefined,
    });
  });

  it('lets callers and configuration override cache headers', async () => {
    let custom = new BucketStorage(bucket, { cacheControl: () => 'public, max-age=60' });

    await custom.writeText('data/a.json', '{}');
    await custom.writeText('data/b.json', '{}', { cacheControl: 'no-store' });

    expect(bucket.objects.get('data/a.json').httpMetadata.cacheControl).toBe('public, max-age=60');
    expect(bucket.objects.get('data/b.json').httpMetadata.cacheControl).toBe('no-store');
  });

  it('always reads the latest content written by another writer', async () => {
    let other = new BucketStorage(bucket);

    await store.writeText('data/locale/en-US.json', '{"v":1}');
    expect(await store.readJson('data/locale/en-US.json')).toEqual({ v: 1 });

    await other.writeText('data/locale/en-US.json', '{"v":2}');
    expect(await store.readJson('data/locale/en-US.json')).toEqual({ v: 2 });
  });

  it('lists each directory once to answer existence checks', async () => {
    await bucket.put('splatnet/v3/a.png', 'a');
    await bucket.put('splatnet/v3/b.png', 'b');
    let list = vi.spyOn(bucket, 'list');

    expect(await store.exists('splatnet/v3/a.png')).toBe(true);
    expect(await store.exists('splatnet/v3/c.png')).toBe(false);
    await store.writeBytes('splatnet/v3/c.png', new Uint8Array([1]));
    expect(await store.exists('splatnet/v3/c.png')).toBe(true);

    expect(list).toHaveBeenCalledOnce();
  });

  it('pages through large directory listings', async () => {
    for (let i = 0; i < 1005; i++) {
      await bucket.put(`splatnet/many/${i}.png`, 'x');
    }

    expect(await store.exists('splatnet/many/1004.png')).toBe(true);
  });

  it('reports last-modified times and deletes objects', async () => {
    expect(await store.lastModified('data/a.json')).toBeNull();

    await store.writeText('data/a.json', '{}');
    expect(await store.lastModified('data/a.json')).toBeInstanceOf(Date);
    expect(await store.exists('data/a.json')).toBe(true);

    await store.delete('data/a.json');
    expect(await store.readJson('data/a.json')).toBeNull();
    expect(await store.exists('data/a.json')).toBe(false);
  });

  it('normalizes the public URL', () => {
    expect(new BucketStorage(bucket, { publicUrl: 'https://assets.example/' }).publicUrl)
      .toBe('https://assets.example');
    expect(store.publicUrl).toBeUndefined();
  });
});

describe('configured storage', () => {
  it('requires every area', () => {
    expect(() => configureStorage({ public: {}, private: {} })).toThrow('Missing archive storage');
  });

  it('is configured with memory buckets for tests', async () => {
    await storage().private.writeText('cache/x.json', '{}');

    expect(await storage().private.readJson('cache/x.json')).toEqual({});
  });
});

describe('filesystem storage', () => {
  let root;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'splatoon3ink-storage-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('keeps the Node runner layout under dist/ and storage/', async () => {
    let local = filesystemStorage(root);

    await local.public.writeText('data/gear.json', '{"gear":true}');
    await local.public.writeBytes('splatnet/v3/a.png', new Uint8Array([1, 2]));
    await local.private.writeText('cache/token.json', '{}');
    await local.archive.writeText('2026-11-08.12-00-00.gear.json', '{}');

    expect(await readFile(path.join(root, 'dist/data/gear.json'), 'utf8')).toBe('{"gear":true}');
    expect([...await readFile(path.join(root, 'dist/assets/splatnet/v3/a.png'))]).toEqual([1, 2]);
    expect(await readFile(path.join(root, 'storage/cache/token.json'), 'utf8')).toBe('{}');
    expect(await readFile(path.join(root, 'storage/archive/2026-11-08.12-00-00.gear.json'), 'utf8')).toBe('{}');
  });

  it('implements the same interface as bucket storage', async () => {
    let local = filesystemStorage(root).public;

    expect(await local.readJson('data/missing.json')).toBeNull();
    expect(await local.readBytes('data/missing.json')).toBeNull();
    expect(await local.exists('splatnet/v3/a.png')).toBe(false);
    expect(await local.lastModified('splatnet/v3/a.png')).toBeNull();

    await local.writeBytes('splatnet/v3/a.png', new Uint8Array([7]));

    expect(await local.exists('splatnet/v3/a.png')).toBe(true);
    expect(await local.lastModified('splatnet/v3/a.png')).toBeInstanceOf(Date);
    expect([...await local.readBytes('splatnet/v3/a.png')]).toEqual([7]);

    await local.delete('splatnet/v3/a.png');
    expect(await local.exists('splatnet/v3/a.png')).toBe(false);
  });
});
