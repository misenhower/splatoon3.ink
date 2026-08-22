import { Readable } from 'node:stream';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ArchivePruner from './ArchivePruner.mjs';

const archiveKey = '2025/03/2025-03-05.tar.zst';
const manifestKey = `${archiveKey}.manifest.json`;

function manifest(createdAt = '2026-08-21T00:00:00.000Z') {
  return {
    version: 1,
    date: '2025-03-05',
    createdAt,
    archive: {
      path: archiveKey,
      bytes: 7,
      hash: `sha256:${'a'.repeat(64)}`,
    },
    files: [{
      path: 'alpha.json',
      bytes: 6,
      hash: `sha256:${'b'.repeat(64)}`,
    }],
  };
}

class FakeS3Client
{
  deletes = [];
  events = [];
  manifest = manifest();
  manifestMissing = false;

  async send(command) {
    if (command instanceof ListObjectsV2Command) {
      return this.list(command.input.Prefix);
    }
    if (command instanceof GetObjectCommand && command.input.Key === manifestKey) {
      return {
        Body: {
          transformToString: async () => JSON.stringify(this.manifest),
        },
      };
    }
    if (command instanceof GetObjectCommand && command.input.Key === archiveKey) {
      return { Body: Readable.from('archive') };
    }
    if (command instanceof DeleteObjectsCommand) {
      this.events.push('delete');
      this.deletes.push(...command.input.Delete.Objects.map(object => object.Key));

      return {};
    }

    throw new Error(`Unexpected S3 command: ${command.constructor.name}`);
  }

  list(prefix) {
    if (prefix === '') {
      return { CommonPrefixes: [{ Prefix: '2025/' }] };
    }
    if (prefix === '2025/') {
      return { CommonPrefixes: [{ Prefix: '2025/03/' }] };
    }
    if (prefix === '2025/03/') {
      return {
        CommonPrefixes: [{ Prefix: '2025/03/05/' }],
        Contents: [
          { Key: archiveKey },
          ...(this.manifestMissing ? [] : [{ Key: manifestKey }]),
        ],
      };
    }
    if (prefix === '2025/03/05/') {
      return {
        Contents: [{
          ETag: '"9f9f90dbe3e5ee1218c86b8839db1995"',
          Key: '2025/03/05/alpha.json',
          LastModified: new Date('2025-03-05T00:00:00.000Z'),
          Size: 6,
        }],
      };
    }

    throw new Error(`Unexpected S3 prefix: ${prefix}`);
  }
}

describe('ArchivePruner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-22T12:00:00.000Z'));
    process.env.AWS_S3_ENDPOINT = 'https://example.invalid';
    process.env.AWS_REGION = 'test';
    process.env.AWS_S3_ARCHIVE_BUCKET = 'archive';
    process.env.AWS_ACCESS_KEY_ID = 'key';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fully verifies recent archives during a dry run without deleting files', async () => {
    let s3Client = new FakeS3Client;
    let verifier = {
      getManifest: vi.fn(async () => s3Client.manifest),
      verify: vi.fn(),
    };
    let pruner = new ArchivePruner(s3Client, verifier);
    pruner.dryRun = true;
    pruner._console = { error: vi.fn(), log: vi.fn() };

    await pruner.process();

    expect(verifier.verify).toHaveBeenCalledOnce();
    expect(s3Client.deletes).toEqual([]);
    expect(pruner._console.log).toHaveBeenCalledWith(
      'Verified 2025-03-05; not eligible for deletion until 2026-08-28',
    );
  });

  it('skips recent archives before downloading and verifying them', async () => {
    let s3Client = new FakeS3Client;
    let verifier = {
      getManifest: vi.fn(async () => s3Client.manifest),
      verify: vi.fn(),
    };
    let pruner = new ArchivePruner(s3Client, verifier);
    pruner._console = { error: vi.fn(), log: vi.fn() };

    await pruner.process();

    expect(verifier.verify).not.toHaveBeenCalled();
    expect(s3Client.deletes).toEqual([]);
    expect(pruner._console.log).toHaveBeenCalledWith(
      'Skipping 2025-03-05; not eligible for deletion until 2026-08-28',
    );
  });

  it('deletes an eligible day only after its archive is verified', async () => {
    let s3Client = new FakeS3Client;
    s3Client.manifest = manifest('2026-08-01T00:00:00.000Z');
    let verifier = {
      getManifest: vi.fn(async () => s3Client.manifest),
      verify: vi.fn(async () => {
        s3Client.events.push('verify');
      }),
    };
    let pruner = new ArchivePruner(s3Client, verifier);
    pruner._console = { error: vi.fn(), log: vi.fn() };

    await pruner.process();

    expect(s3Client.events).toEqual(['verify', 'delete']);
    expect(s3Client.deletes).toEqual(['2025/03/05/alpha.json']);
    expect(pruner._console.log).toHaveBeenCalledWith('Pruned 2025-03-05; deleted 1 file');
  });

  it('stops when an archive exists without its manifest', async () => {
    let s3Client = new FakeS3Client;
    s3Client.manifestMissing = true;
    let verifier = { getManifest: vi.fn(), verify: vi.fn() };
    let pruner = new ArchivePruner(s3Client, verifier);
    pruner._console = { error: vi.fn(), log: vi.fn() };

    await expect(pruner.process()).rejects.toThrow(
      'Archive and manifest are incomplete for 2025-03-05',
    );

    expect(verifier.verify).not.toHaveBeenCalled();
    expect(s3Client.deletes).toEqual([]);
  });

  it('stops without deleting when archive verification fails', async () => {
    let s3Client = new FakeS3Client;
    s3Client.manifest = manifest('2026-08-01T00:00:00.000Z');
    let verifier = {
      getManifest: vi.fn(async () => s3Client.manifest),
      verify: vi.fn(async () => {
        throw new Error('archive does not match');
      }),
    };
    let pruner = new ArchivePruner(s3Client, verifier);
    pruner._console = { error: vi.fn(), log: vi.fn() };

    await expect(pruner.process()).rejects.toThrow('archive does not match');

    expect(s3Client.deletes).toEqual([]);
  });
});
