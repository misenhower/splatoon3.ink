import { describe, it, expect, vi } from 'vitest';
import { mkdirp, exists, olderThan } from './fs.mjs';

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
  },
}));

const fs = (await import('fs/promises')).default;

describe('mkdirp', () => {
  it('calls fs.mkdir with recursive: true', async () => {
    fs.mkdir.mockResolvedValue(undefined);
    await mkdirp('/some/path');
    expect(fs.mkdir).toHaveBeenCalledWith('/some/path', { recursive: true });
  });
});

describe('exists', () => {
  it('returns true when fs.access succeeds', async () => {
    fs.access.mockResolvedValue(undefined);
    expect(await exists('/some/file')).toBe(true);
  });

  it('returns false when fs.access throws', async () => {
    fs.access.mockRejectedValue(new Error('ENOENT'));
    expect(await exists('/missing/file')).toBe(false);
  });
});

describe('olderThan', () => {
  it('returns true when mtime is before cutoff', async () => {
    fs.stat.mockResolvedValue({ mtime: new Date('2024-01-01') });
    expect(await olderThan('/file', new Date('2024-06-01'))).toBe(true);
  });

  it('returns false when mtime is after cutoff', async () => {
    fs.stat.mockResolvedValue({ mtime: new Date('2024-06-01') });
    expect(await olderThan('/file', new Date('2024-01-01'))).toBe(false);
  });

  it('returns true when file is missing', async () => {
    fs.stat.mockRejectedValue(new Error('ENOENT'));
    expect(await olderThan('/missing', new Date())).toBe(true);
  });
});
