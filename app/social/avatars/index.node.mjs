import fs from 'node:fs/promises';

// Node implementation of #avatars; index.worker.mjs bundles the same files for Workers.

/**
 * @param {string} filename An avatar file in this directory, such as default.png
 * @returns {Promise<Uint8Array>} The PNG bytes
 */
export async function readAvatar(filename) {
  return new Uint8Array(await fs.readFile(new URL(`./${filename}`, import.meta.url)));
}
