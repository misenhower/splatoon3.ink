import fs from 'fs/promises';

export async function exists(file) {
  try {
    await fs.access(file);

    return true;
  } catch (e) {
    return false;
  }
}

// Determine whether a file is older than a given cutoff date (or doesn't exist)
export async function olderThan(file, cutoff) {
  try {
    let stat = await fs.stat(file);

    return stat.mtime < cutoff;
  } catch (e) {
    return true;
  }
}
