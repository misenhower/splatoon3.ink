import fs from 'fs/promises';
import vfs from './vfs.mjs';

export function mkdirp(dir) {
  return fs.mkdir(dir, { recursive: true });
}

export async function exists(file) {
  try {
    await fs.access(file);

    return true;
  } catch (e) {
    // Not on local disk; check VFS (S3 listing) as fallback
    return (await vfs.has(file)) ?? false;
  }
}

// Determine whether a file is older than a given cutoff date (or doesn't exist)
export async function olderThan(file, cutoff) {
  try {
    let stat = await fs.stat(file);

    return stat.mtime < cutoff;
  } catch (e) {
    // Not on local disk; check VFS (S3 listing) as fallback
    const mtime = await vfs.getMtime(file);
    if (mtime !== null) {
      return mtime < cutoff;
    }

    return true;
  }
}
