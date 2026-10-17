import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import BufferMedia from './BufferMedia.mjs';

describe('BufferMedia', () => {
  beforeEach(() => {
    vi.stubEnv('R2_ENDPOINT', 'https://account.r2.cloudflarestorage.com');
    vi.stubEnv('R2_BUCKET', 'dev-images');
    vi.stubEnv('R2_PUBLIC_URL', 'https://dev-assets.example/');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'r2-test-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'r2-test-secret');
    vi.stubEnv('AWS_S3_BUCKET', 'legacy-images');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('uploads distinct images to R2 with unsigned public URLs', async () => {
    const send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({});
    const media = new BufferMedia;
    const input = { file: new Uint8Array([1, 2, 3]), type: 'image/png' };

    const first = await media.upload(input);
    const second = await media.upload(input);
    const url = new URL(first.url);

    expect(first.key).toMatch(/^buffer-twitter\/.+\.png$/);
    expect(second.url).not.toBe(first.url);
    expect(first.url).toBe(`https://dev-assets.example/${first.key}`);
    expect(url.search).toBe('');
    expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'dev-images',
      Key: first.key,
      Body: Buffer.from([1, 2, 3]),
      ContentType: 'image/png',
      CacheControl: 'private, no-store',
    });
    expect(send.mock.calls[0][0].input).not.toHaveProperty('ACL');
  });

  it('requires R2 configuration even when legacy S3 is configured', () => {
    const media = new BufferMedia;
    expect(media.canUpload()).toBe(true);

    vi.stubEnv('R2_SECRET_ACCESS_KEY', '');
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'legacy-key');
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'legacy-secret');
    vi.stubEnv('AWS_S3_ENDPOINT', 'https://s3.example');
    vi.stubEnv('AWS_REGION', 'example-region');

    expect(media.canUpload()).toBe(false);
  });

  it('reports missing R2 settings before uploading', async () => {
    vi.stubEnv('R2_PUBLIC_URL', '');
    const send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({});
    const media = new BufferMedia;

    await expect(media.upload({ file: Buffer.from('image'), type: 'image/png' }))
      .rejects.toThrow('Buffer images require R2_ENDPOINT, R2_BUCKET, R2_PUBLIC_URL');
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    'http://dev-assets.example',
    'https://user:password@dev-assets.example',
    'https://dev-assets.example?token=example',
    'https://dev-assets.example#images',
  ])('rejects invalid public URL %s before uploading', async publicUrl => {
    vi.stubEnv('R2_PUBLIC_URL', publicUrl);
    const send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({});
    const media = new BufferMedia;

    await expect(media.upload({ file: Buffer.from('image'), type: 'image/png' }))
      .rejects.toThrow('R2_PUBLIC_URL');
    await expect(media.upload({ file: Buffer.from('video'), type: 'video/mp4' }))
      .rejects.toThrow('PNG or JPEG');
    expect(send).not.toHaveBeenCalled();
  });
});
