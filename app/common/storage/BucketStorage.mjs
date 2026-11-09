import { contentTypeFor, DATA_CACHE_CONTROL } from './metadata.mjs';

function directoryOf(key) {
  return key.slice(0, key.lastIndexOf('/') + 1);
}

function defaultCacheControl(key) {
  return key.startsWith('data/') ? DATA_CACHE_CONTROL : undefined;
}

/**
 * Storage over an R2 bucket binding (or a MemoryBucket in tests).
 *
 * Reads always go to the bucket, so other writers' changes are visible immediately. The one
 * exception is exists(): it lists a key's directory once and remembers what it has seen, which
 * keeps image checks cheap. Only use exists() for keys that are never deleted or replaced by
 * other writers, such as mirrored SplatNet images.
 */
export default class BucketStorage {
  #bucket;
  #cacheControl;
  #known = new Set();
  #listed = new Set();

  /**
   * @param {object} bucket An R2 bucket binding (or MemoryBucket)
   * @param {object} [options]
   * @param {string} [options.publicUrl] Base URL serving this bucket's objects, if public
   * @param {(key: string) => string|undefined} [options.cacheControl] Cache-Control for writes
   */
  constructor(bucket, { publicUrl, cacheControl = defaultCacheControl } = {}) {
    this.#bucket = bucket;
    this.#cacheControl = cacheControl;
    this.publicUrl = publicUrl?.replace(/\/+$/, '');
  }

  async exists(key) {
    if (this.#known.has(key)) {
      return true;
    }

    let directory = directoryOf(key);

    if (!this.#listed.has(directory)) {
      let cursor;

      do {
        let page = await this.#bucket.list({ prefix: directory, cursor, limit: 1000 });

        for (let object of page.objects) {
          this.#known.add(object.key);
        }

        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);

      this.#listed.add(directory);
    }

    return this.#known.has(key);
  }

  /**
   * @param {string} key
   * @returns {Promise<Date|null>} When the object was last written, or null if missing
   */
  async lastModified(key) {
    return (await this.#bucket.head(key))?.uploaded ?? null;
  }

  /**
   * @param {string} key
   * @returns {Promise<object|null>} The parsed document, or null if it does not exist
   */
  async readJson(key) {
    let object = await this.#bucket.get(key);

    return object ? JSON.parse(await object.text()) : null;
  }

  /**
   * @param {string} key
   * @returns {Promise<Uint8Array|null>} The object's bytes, or null if it does not exist
   */
  async readBytes(key) {
    let object = await this.#bucket.get(key);

    return object ? new Uint8Array(await object.arrayBuffer()) : null;
  }

  async writeText(key, text, options = {}) {
    await this.#put(key, text, options);
  }

  async writeBytes(key, bytes, options = {}) {
    await this.#put(key, bytes, options);
  }

  async delete(key) {
    await this.#bucket.delete(key);
    this.#known.delete(key);
  }

  async #put(key, body, { contentType = contentTypeFor(key), cacheControl = this.#cacheControl(key) }) {
    await this.#bucket.put(key, body, { httpMetadata: { contentType, cacheControl } });
    this.#known.add(key);
  }
}
