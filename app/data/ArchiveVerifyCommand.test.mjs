import {
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ArchiveVerifyCommand, { verifyArchivesFromCli } from './ArchiveVerifyCommand.mjs';
import { AppleDoubleArchiveError } from './ArchiveContentVerifier.mjs';

const candidate = {
  archiveKey: '2025/03/2025-03-05.tar.zst',
  date: '2025-03-05',
  manifestKey: '2025/03/2025-03-05.tar.zst.manifest.json',
  prefix: '2025/03/05/',
};

class FakeS3Client
{
  sourcePruned = false;

  async send(command) {
    if (command instanceof ListObjectsV2Command) {
      return this.list(command.input.Prefix);
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
        CommonPrefixes: this.sourcePruned ? [] : [{ Prefix: candidate.prefix }],
        Contents: [
          { Key: candidate.archiveKey },
          { Key: candidate.manifestKey },
        ],
      };
    }
    if (prefix === candidate.prefix) {
      return {
        Contents: [{
          ETag: '"9f9f90dbe3e5ee1218c86b8839db1995"',
          Key: `${candidate.prefix}alpha.json`,
          LastModified: new Date('2025-03-05T00:00:00.000Z'),
          Size: 6,
        }],
      };
    }

    throw new Error(`Unexpected S3 prefix: ${prefix}`);
  }
}

describe('ArchiveVerifyCommand', () => {
  beforeEach(() => {
    process.env.AWS_S3_ENDPOINT = 'https://example.invalid';
    process.env.AWS_REGION = 'test';
    process.env.AWS_S3_ARCHIVE_BUCKET = 'archive';
    process.env.AWS_ACCESS_KEY_ID = 'key';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not accept a redundant dry-run option', () => {
    expect(() => verifyArchivesFromCli(['--dry-run'])).toThrow(
      'Usage: npm run data:archive:verify',
    );
  });

  it('verifies archives without rebuilding valid ones', async () => {
    let verifier = { verify: vi.fn() };
    let builder = { build: vi.fn() };
    let verification = new ArchiveVerifyCommand(new FakeS3Client, verifier, builder);
    verification._console = { error: vi.fn(), log: vi.fn() };

    await verification.process();

    expect(verifier.verify).toHaveBeenCalledOnce();
    expect(builder.build).not.toHaveBeenCalled();
    expect(verification._console.log).toHaveBeenCalledWith('Verified 2025-03-05');
  });

  it('verifies pruned archives against their manifests', async () => {
    let s3Client = new FakeS3Client;
    s3Client.sourcePruned = true;
    let verifier = { verify: vi.fn() };
    let verification = new ArchiveVerifyCommand(s3Client, verifier, { build: vi.fn() });
    verification._console = { error: vi.fn(), log: vi.fn() };

    await verification.process();

    expect(verifier.verify).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2025-03-05' }),
      null,
    );
    expect(verification._console.log).toHaveBeenCalledWith('Verified 2025-03-05');
  });

  it('reports AppleDouble archives without changing them by default', async () => {
    let verifier = {
      verify: vi.fn(async () => {
        throw new AppleDoubleArchiveError('._alpha.json');
      }),
    };
    let builder = { build: vi.fn() };
    let verification = new ArchiveVerifyCommand(new FakeS3Client, verifier, builder);
    verification._console = { error: vi.fn(), log: vi.fn() };

    await verification.process();

    expect(builder.build).not.toHaveBeenCalled();
    expect(verification._console.log).toHaveBeenCalledWith(
      '2025-03-05 contains unexpected macOS metadata',
    );
  });

  it('repairs AppleDouble archives only when repair is enabled', async () => {
    let verifier = {
      verify: vi.fn(async () => {
        throw new AppleDoubleArchiveError('._alpha.json');
      }),
    };
    let builder = { build: vi.fn() };
    let verification = new ArchiveVerifyCommand(new FakeS3Client, verifier, builder);
    verification.repair = true;
    verification._console = { error: vi.fn(), log: vi.fn() };

    await verification.process();

    expect(builder.build).toHaveBeenCalledOnce();
    expect(verification._console.log).toHaveBeenCalledWith('Repaired 2025-03-05');
  });

  it('stops instead of repairing unrelated verification failures', async () => {
    let verifier = {
      verify: vi.fn(async () => {
        throw new Error('Archive SHA-256 does not match its manifest');
      }),
    };
    let builder = { build: vi.fn() };
    let verification = new ArchiveVerifyCommand(new FakeS3Client, verifier, builder);
    verification.repair = true;
    verification._console = { error: vi.fn(), log: vi.fn() };

    await expect(verification.process()).rejects.toThrow(
      'Archive SHA-256 does not match its manifest',
    );
    expect(builder.build).not.toHaveBeenCalled();
  });
});
