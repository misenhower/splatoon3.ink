import { describe, expect, it } from 'vitest';
import BufferMedia from './BufferMedia.mjs';
import { BucketStorage, MemoryBucket, configureStorage } from '../../common/storage/index.mjs';
import { testBuckets } from '../../test/storage.mjs';

function usePublicUrl(publicUrl) {
  configureStorage({
    public: new BucketStorage(testBuckets().public, { publicUrl }),
    private: new BucketStorage(new MemoryBucket),
    archive: new BucketStorage(new MemoryBucket),
  });
}

describe('BufferMedia', () => {
  it('uploads distinct images to public storage with unsigned public URLs', async () => {
    usePublicUrl('https://dev-assets.example/');
    const media = new BufferMedia;
    const input = { file: new Uint8Array([1, 2, 3]), type: 'image/png' };

    const first = await media.upload(input);
    const second = await media.upload(input);
    const url = new URL(first.url);

    expect(first.key).toMatch(/^buffer-twitter\/.+\.png$/);
    expect(second.url).not.toBe(first.url);
    expect(first.url).toBe(`https://dev-assets.example/${first.key}`);
    expect(url.search).toBe('');

    const stored = testBuckets().public.objects.get(first.key);
    expect([...stored.bytes]).toEqual([1, 2, 3]);
    expect(stored.httpMetadata).toEqual({ contentType: 'image/png', cacheControl: 'private, no-store' });
  });

  it('requires public storage with a public URL', async () => {
    usePublicUrl(undefined);
    const media = new BufferMedia;

    expect(media.canUpload()).toBe(false);
    await expect(media.upload({ file: new Uint8Array([1]), type: 'image/png' }))
      .rejects.toThrow('public storage with a public URL');
    expect(testBuckets().public.objects.size).toBe(0);
  });

  it.each([
    'http://dev-assets.example',
    'https://user:password@dev-assets.example',
    'https://dev-assets.example?token=example',
    'https://dev-assets.example#images',
  ])('rejects invalid public URL %s before uploading', async publicUrl => {
    usePublicUrl(publicUrl);
    const media = new BufferMedia;

    await expect(media.upload({ file: new Uint8Array([1]), type: 'image/png' }))
      .rejects.toThrow('HTTPS base URL');
    await expect(media.upload({ file: new Uint8Array([1]), type: 'video/mp4' }))
      .rejects.toThrow('PNG or JPEG');
    expect(testBuckets().public.objects.size).toBe(0);
  });
});
