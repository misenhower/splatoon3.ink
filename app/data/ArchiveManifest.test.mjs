import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createArchiveManifest,
  getArchiveManifestStats,
  parseArchiveManifest,
} from './ArchiveManifest.mjs';

describe('ArchiveManifest', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates the public manifest format', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-18T12:00:00.000Z'));
    let archive = {
      path: '2025/03/2025-03-05.tar.zst',
      bytes: 123,
      hash: `sha256:${'a'.repeat(64)}`,
    };
    let files = [{
      path: 'sample.json',
      bytes: 456,
      hash: `sha256:${'b'.repeat(64)}`,
    }];

    expect(createArchiveManifest('2025-03-05', archive, files)).toEqual({
      version: 1,
      date: '2025-03-05',
      createdAt: '2026-08-18T12:00:00.000Z',
      archive,
      files,
    });
  });

  it('parses a valid manifest', () => {
    let manifest = {
      version: 1,
      date: '2025-03-05',
      createdAt: '2026-08-18T12:00:00.000Z',
      archive: {
        path: '2025/03/2025-03-05.tar.zst',
        bytes: 123,
        hash: `sha256:${'a'.repeat(64)}`,
      },
      files: [{
        path: 'sample.json',
        bytes: 456,
        hash: `sha256:${'b'.repeat(64)}`,
      }],
    };

    expect(parseArchiveManifest(
      JSON.stringify(manifest),
      '2025/03/2025-03-05.tar.zst',
    )).toEqual(manifest);
  });

  it('rejects a manifest without valid SHA-256 hashes', () => {
    let manifest = {
      version: 1,
      date: '2025-03-05',
      createdAt: '2026-08-18T12:00:00.000Z',
      archive: {
        path: '2025/03/2025-03-05.tar.zst',
        bytes: 123,
        hash: 'not-a-hash',
      },
      files: [{
        path: 'sample.json',
        bytes: 456,
        hash: `sha256:${'b'.repeat(64)}`,
      }],
    };

    expect(() => parseArchiveManifest(
      JSON.stringify(manifest),
      '2025/03/2025-03-05.tar.zst',
    )).toThrow('Invalid archive manifest');
  });

  it('summarizes the sizes recorded in a manifest', () => {
    let manifest = {
      archive: { path: '2025/03/2025-03-05.tar.zst', bytes: 123 },
      files: [{ bytes: 400 }, { bytes: 600 }],
    };

    expect(getArchiveManifestStats(manifest)).toEqual({
      path: '2025/03/2025-03-05.tar.zst',
      compressedBytes: 123,
      fileCount: 2,
      originalBytes: 1000,
    });
  });
});
