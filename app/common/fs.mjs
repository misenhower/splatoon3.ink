import fs from 'fs/promises';
import vfs from './vfs.mjs';

export function mkdirp(dir) {
  return fs.mkdir(dir, { recursive: true });
}

export async function exists(file) {
  const vfsResult = vfs.has(file);
  if (vfsResult !== null) {
    return vfsResult;
  }

  try {
    await fs.access(file);

    return true;
  } catch (e) {
    return false;
  }
}

// Determine whether a file is older than a given cutoff date (or doesn't exist)
export async function olderThan(file, cutoff) {
  const mtime = vfs.getMtime(file);
  if (mtime !== null) {
    return mtime < cutoff;
  }

  try {
    let stat = await fs.stat(file);

    return stat.mtime < cutoff;
  } catch (e) {
    return true;
  }
}
