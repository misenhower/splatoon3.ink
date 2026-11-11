import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { S3ArchiveStorage } from '../../app/common/storage/index.mjs';
import { archiveStorage } from './src/runtime.mjs';

const spaces = {
  AWS_S3_ENDPOINT: 'https://nyc3.spaces.test',
  AWS_REGION: 'nyc3',
  AWS_S3_ARCHIVE_BUCKET: 'archive-test',
  AWS_ACCESS_KEY_ID: 'key-id',
  AWS_SECRET_ACCESS_KEY: 'secret',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('archive storage', () => {
  it('turns snapshots on through the environment the shared code reads', () => {
    // DataUpdater checks process.env.ARCHIVE_DATA; Worker vars have to show up there.
    expect(env.ARCHIVE_DATA).toBe('true');
    expect(process.env.ARCHIVE_DATA).toBe('true');
  });

  it('writes snapshots to the archive bucket, signed, from workerd', async () => {
    let requests = [];

    vi.stubGlobal('fetch', async (input, init) => {
      requests.push(new Request(input, init));

      return new Response(null, { status: 200 });
    });

    let archive = archiveStorage({ ...env, ...spaces });

    expect(archive).toBeInstanceOf(S3ArchiveStorage);

    await archive.writeText('2026-11-08.12-00-00.gear.json', '{"a":1}');

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('PUT');
    expect(requests[0].url).toBe('https://nyc3.spaces.test/archive-test/2026/11/08/2026-11-08.12-00-00.gear.json');
    expect(requests[0].headers.get('x-amz-acl')).toBe('public-read');
    expect(requests[0].headers.get('Authorization')).toMatch(/^AWS4-HMAC-SHA256 Credential=key-id\//);
  });

  it('refuses to write, without a request, while a setting is missing', async () => {
    let fetch = vi.fn();

    vi.stubGlobal('fetch', fetch);

    let archive = archiveStorage({ ...env, ...spaces, AWS_SECRET_ACCESS_KEY: undefined });

    expect(archive).not.toBeInstanceOf(S3ArchiveStorage);
    expect(() => archive.writeText('2026-11-08.12-00-00.gear.json', '{}')).toThrow('AWS_SECRET_ACCESS_KEY');
    expect(fetch).not.toHaveBeenCalled();
  });
});
