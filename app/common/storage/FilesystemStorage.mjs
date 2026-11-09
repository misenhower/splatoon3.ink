import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Storage over a local directory, used by the Node runner. Keys map to paths under the root;
 * `relocations` maps key prefixes to different directories (for example, R2's `splatnet/`
 * images live under dist/assets/splatnet/ locally). HTTP metadata is accepted and ignored.
 */
export default class FilesystemStorage {
  constructor(root, { relocations = {} } = {}) {
    this.root = path.resolve(root);
    this.relocations = Object.entries(relocations);
  }

  pathFor(key) {
    for (let [prefix, replacement] of this.relocations) {
      if (key.startsWith(prefix)) {
        key = replacement + key.slice(prefix.length);
        break;
      }
    }

    return path.join(this.root, ...key.split('/'));
  }

  async exists(key) {
    return (await this.#stat(key))?.isFile() ?? false;
  }

  /**
   * @param {string} key
   * @returns {Promise<Date|null>} When the file was last written, or null if missing
   */
  async lastModified(key) {
    return (await this.#stat(key))?.mtime ?? null;
  }

  /**
   * @param {string} key
   * @returns {Promise<object|null>} The parsed document, or null if it does not exist
   */
  async readJson(key) {
    let buffer = await this.#read(key);

    return buffer === null ? null : JSON.parse(buffer.toString('utf8'));
  }

  /**
   * @param {string} key
   * @returns {Promise<Uint8Array|null>} The file's bytes, or null if it does not exist
   */
  async readBytes(key) {
    let buffer = await this.#read(key);

    return buffer === null ? null : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }

  async writeText(key, text) {
    await this.#write(key, text);
  }

  async writeBytes(key, bytes) {
    await this.#write(key, bytes);
  }

  async delete(key) {
    await fs.rm(this.pathFor(key), { force: true });
  }

  async #stat(key) {
    try {
      return await fs.stat(this.pathFor(key));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  async #read(key) {
    try {
      return await fs.readFile(this.pathFor(key));
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'EISDIR') {
        return null;
      }

      throw error;
    }
  }

  async #write(key, body) {
    let filename = this.pathFor(key);

    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, body);
  }
}
