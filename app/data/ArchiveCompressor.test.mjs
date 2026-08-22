import { Readable } from 'node:stream';
import fs from 'node:fs/promises';
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ArchiveCompressor from './ArchiveCompressor.mjs';
import { AppleDoubleArchiveError } from './ArchiveVerifier.mjs';

const archiveKey = '2025/03/2025-03-05.tar.zst';
const manifestKey = `${archiveKey}.manifest.json`;

function completedManifest() {
  return {
    version: 1,
    date: '2025-03-05',
    createdAt: '2026-08-20T00:00:00.000Z',
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
  completed = false;
  downloads = [];
  files = new Map([
    ['2025/03/05/alpha.json', Buffer.from('alpha\n')],
    ['2025/03/05/nested/beta.json', Buffer.from('beta\n')],
  ]);
  manifestLastModified = new Date('2026-08-20T00:00:00.000Z');
  secondDay = false;
  uploads = [];

  async send(command) {
    if (command instanceof ListObjectsV2Command) {
      return this.list(command.input.Prefix);
    }

    if (command instanceof GetObjectCommand) {
      this.downloads.push(command.input.Key);

      if (command.input.Key === manifestKey) {
        return {
          Body: {
            transformToString: async () => JSON.stringify(completedManifest()),
          },
        };
      }
      if (command.input.Key === archiveKey) {
        return { Body: Readable.from('archive') };
      }

      return { Body: Readable.from(this.files.get(command.input.Key)) };
    }

    if (command instanceof PutObjectCommand) {
      this.uploads.push(command.input);

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
        CommonPrefixes: [
          { Prefix: '2025/03/05/' },
          ...(this.secondDay ? [{ Prefix: '2025/03/06/' }] : []),
        ],
        Contents: this.completed ? [
          { Key: '2025/03/2025-03-05.tar.zst' },
          {
            Key: '2025/03/2025-03-05.tar.zst.manifest.json',
            LastModified: this.manifestLastModified,
          },
        ] : [],
      };
    }
    if (/^2025\/03\/\d{2}\/$/.test(prefix)) {
      return { Contents: [...this.files]
        .filter(([Key]) => Key.startsWith(prefix))
        .map(([Key, body]) => ({
          ETag: '"9f9f90dbe3e5ee1218c86b8839db1995"',
          Key,
          LastModified: new Date('2025-03-05T23:45:00.000Z'),
          Size: body.length,
        })) };
    }

    throw new Error(`Unexpected S3 prefix: ${prefix}`);
  }
}

class PaginatedS3Client extends FakeS3Client
{
  async send(command) {
    if (command instanceof ListObjectsV2Command && command.input.Prefix === '') {
      if (!command.input.ContinuationToken) {
        return {
          CommonPrefixes: [],
          IsTruncated: true,
          NextContinuationToken: 'next-page',
        };
      }

      expect(command.input.ContinuationToken).toBe('next-page');

      return { CommonPrefixes: [{ Prefix: '2025/' }] };
    }

    return super.send(command);
  }
}

describe('ArchiveCompressor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-18T12:00:00.000Z'));
    process.env.AWS_S3_ENDPOINT = 'https://example.invalid';
    process.env.AWS_REGION = 'test';
    process.env.AWS_S3_ARCHIVE_BUCKET = 'archive';
    process.env.AWS_ACCESS_KEY_ID = 'key';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('downloads a day and publishes its archive and manifest', async () => {
    let s3Client = new FakeS3Client;
    let temporaryDirectory;
    let archiveWriter = {
      async write(sourceDirectory, archivePath, files) {
        temporaryDirectory = sourceDirectory.slice(0, -'/source'.length);
        expect(files).toEqual(['alpha.json', 'nested/beta.json']);
        expect(await fs.readFile(`${sourceDirectory}/alpha.json`, 'utf8')).toBe('alpha\n');
        expect(await fs.readFile(`${sourceDirectory}/nested/beta.json`, 'utf8')).toBe('beta\n');
        await fs.writeFile(archivePath, 'fake compressed archive');
      },
    };
    let compressor = new ArchiveCompressor(s3Client, archiveWriter);
    compressor._console = { error: vi.fn(), log: vi.fn() };

    await compressor.process();

    expect(s3Client.uploads.map(upload => upload.Key)).toEqual([
      '2025/03/2025-03-05.tar.zst',
      '2025/03/2025-03-05.tar.zst.manifest.json',
    ]);
    expect(s3Client.uploads[0].Body.toString()).toBe('fake compressed archive');
    expect(JSON.parse(s3Client.uploads[1].Body)).toEqual({
      version: 1,
      date: '2025-03-05',
      createdAt: '2026-08-18T12:00:00.000Z',
      archive: {
        path: '2025/03/2025-03-05.tar.zst',
        bytes: 23,
        hash: 'sha256:01bba9b6e21a70b88e2fb19741b8aa5e24f7d0ee368224528e7a451fcce5cbc6',
      },
      files: [
        {
          path: 'alpha.json',
          bytes: 6,
          hash: 'sha256:b6a98d9ce9a2d9149288fa3df42d377c3e42737afdcdaf714e33c0a100b51060',
        },
        {
          path: 'nested/beta.json',
          bytes: 5,
          hash: 'sha256:f2c82decdd7181cf98945929a62598db7e6b477e11f6e0eb0ae97020eff151ad',
        },
      ],
    });
    await expect(fs.stat(temporaryDirectory)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('does not download or upload files during a dry run', async () => {
    let s3Client = new FakeS3Client;
    let archiveWriter = { write: vi.fn() };
    let compressor = new ArchiveCompressor(s3Client, archiveWriter);
    compressor.dryRun = true;
    compressor._console = { error: vi.fn(), log: vi.fn() };

    await compressor.process();

    expect(s3Client.downloads).toEqual([]);
    expect(s3Client.uploads).toEqual([]);
    expect(archiveWriter.write).not.toHaveBeenCalled();
  });

  it('leaves a completed archive alone', async () => {
    let s3Client = new FakeS3Client;
    s3Client.completed = true;
    let archiveWriter = { write: vi.fn() };
    let compressor = new ArchiveCompressor(s3Client, archiveWriter);
    compressor._console = { error: vi.fn(), log: vi.fn() };

    await compressor.process();

    expect(s3Client.downloads).toEqual([]);
    expect(s3Client.uploads).toEqual([]);
    expect(archiveWriter.write).not.toHaveBeenCalled();
  });

  it('leaves a valid completed archive older than the repair cutoff alone', async () => {
    let s3Client = new FakeS3Client;
    s3Client.completed = true;
    let verifier = { verify: vi.fn() };
    let archiveWriter = { write: vi.fn() };
    let compressor = new ArchiveCompressor(s3Client, archiveWriter, verifier);
    compressor.rebuildBefore = Date.parse('2026-08-22T16:49:12.000Z');
    compressor._console = { error: vi.fn(), log: vi.fn() };

    await compressor.process();

    expect(verifier.verify).toHaveBeenCalledOnce();
    expect(s3Client.uploads).toEqual([]);
    expect(archiveWriter.write).not.toHaveBeenCalled();
  });

  it('rebuilds a completed archive containing macOS metadata', async () => {
    let s3Client = new FakeS3Client;
    s3Client.completed = true;
    let verifier = {
      verify: vi.fn(async () => {
        throw new AppleDoubleArchiveError('._alpha.json');
      }),
    };
    let archiveWriter = {
      async write(sourceDirectory, archivePath) {
        await fs.writeFile(archivePath, 'replacement archive');
      },
    };
    let compressor = new ArchiveCompressor(s3Client, archiveWriter, verifier);
    compressor.rebuildBefore = Date.parse('2026-08-22T16:49:12.000Z');
    compressor._console = { error: vi.fn(), log: vi.fn() };

    await compressor.process();

    expect(s3Client.uploads.map(upload => upload.Key)).toEqual([
      '2025/03/2025-03-05.tar.zst',
      '2025/03/2025-03-05.tar.zst.manifest.json',
    ]);
  });

  it('leaves a rebuilt archive newer than the repair cutoff alone', async () => {
    let s3Client = new FakeS3Client;
    s3Client.completed = true;
    s3Client.manifestLastModified = new Date('2026-08-23T00:00:00.000Z');
    let archiveWriter = { write: vi.fn() };
    let compressor = new ArchiveCompressor(s3Client, archiveWriter);
    compressor.rebuildBefore = Date.parse('2026-08-22T16:49:12.000Z');
    compressor._console = { error: vi.fn(), log: vi.fn() };

    await compressor.process();

    expect(s3Client.uploads).toEqual([]);
    expect(archiveWriter.write).not.toHaveBeenCalled();
  });

  it('stops after a failed day and removes its temporary files', async () => {
    vi.useRealTimers();
    let s3Client = new FakeS3Client;
    s3Client.secondDay = true;
    s3Client.files.set('2025/03/06/gamma.json', Buffer.from('gamma\n'));
    let temporaryDirectory;
    let archiveWriter = {
      async write(sourceDirectory) {
        temporaryDirectory = sourceDirectory.slice(0, -'/source'.length);
        throw new Error('compression failed');
      },
    };
    let compressor = new ArchiveCompressor(s3Client, archiveWriter);
    compressor._console = { error: vi.fn(), log: vi.fn() };

    await expect(compressor.process()).rejects.toThrow('compression failed');

    expect(s3Client.downloads.toSorted()).toEqual([
      '2025/03/05/alpha.json',
      '2025/03/05/nested/beta.json',
    ]);
    expect(s3Client.uploads).toEqual([]);
    await expect(fs.stat(temporaryDirectory)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('continues S3 discovery across paginated listings', async () => {
    let s3Client = new PaginatedS3Client;
    let archiveWriter = {
      async write(sourceDirectory, archivePath) {
        await fs.writeFile(archivePath, 'archive');
      },
    };
    let compressor = new ArchiveCompressor(s3Client, archiveWriter);
    compressor._console = { error: vi.fn(), log: vi.fn() };

    await compressor.process();

    expect(s3Client.uploads.map(upload => upload.Key)).toEqual([
      '2025/03/2025-03-05.tar.zst',
      '2025/03/2025-03-05.tar.zst.manifest.json',
    ]);
  });

  it('does not process more than maxDays', async () => {
    let s3Client = new FakeS3Client;
    s3Client.secondDay = true;
    s3Client.files.set('2025/03/06/gamma.json', Buffer.from('gamma\n'));
    let archiveWriter = {
      async write(sourceDirectory, archivePath) {
        await fs.writeFile(archivePath, 'archive');
      },
    };
    let compressor = new ArchiveCompressor(s3Client, archiveWriter);
    compressor.maxDays = 1;
    compressor._console = { error: vi.fn(), log: vi.fn() };

    await compressor.process();

    expect(s3Client.uploads.map(upload => upload.Key)).toEqual([
      '2025/03/2025-03-05.tar.zst',
      '2025/03/2025-03-05.tar.zst.manifest.json',
    ]);
  });
});
