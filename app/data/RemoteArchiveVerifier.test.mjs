import { Readable } from 'node:stream';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';
import RemoteArchiveVerifier from './RemoteArchiveVerifier.mjs';

const candidate = {
  archiveKey: '2025/03/2025-03-05.tar.zst',
  date: '2025-03-05',
  manifestKey: '2025/03/2025-03-05.tar.zst.manifest.json',
};

const manifest = {
  version: 1,
  date: candidate.date,
  createdAt: '2026-08-20T00:00:00.000Z',
  archive: {
    path: candidate.archiveKey,
    bytes: 7,
    hash: `sha256:${'a'.repeat(64)}`,
  },
  files: [{
    path: 'alpha.json',
    bytes: 6,
    hash: `sha256:${'b'.repeat(64)}`,
  }],
};

class FakeS3Client
{
  async send(command) {
    if (!(command instanceof GetObjectCommand)) {
      throw new Error(`Unexpected S3 command: ${command.constructor.name}`);
    }
    if (command.input.Key === candidate.manifestKey) {
      return {
        Body: {
          transformToString: async () => JSON.stringify(manifest),
        },
      };
    }
    if (command.input.Key === candidate.archiveKey) {
      return { Body: Readable.from('archive') };
    }

    throw new Error(`Unexpected S3 key: ${command.input.Key}`);
  }
}

describe('RemoteArchiveVerifier', () => {
  it('downloads and verifies an archive and its manifest', async () => {
    let sourceObjects = [{
      path: 'alpha.json',
      bytes: 6,
      etag: '"9f9f90dbe3e5ee1218c86b8839db1995"',
    }];
    let contentVerifier = { verify: vi.fn() };
    let verifier = new RemoteArchiveVerifier(new FakeS3Client, contentVerifier);

    await expect(verifier.verify(candidate, sourceObjects)).resolves.toEqual(manifest);
    expect(contentVerifier.verify).toHaveBeenCalledOnce();
    expect(contentVerifier.verify.mock.calls[0][1]).toEqual(manifest);
    expect(contentVerifier.verify.mock.calls[0][2]).toBe(sourceObjects);
  });
});
