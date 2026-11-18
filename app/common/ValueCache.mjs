import { storage } from './storage/index.mjs';

/** A small JSON value with an optional expiry, kept in private storage under cache/. */
export default class ValueCache
{
  constructor(key) {
    this._key = key;
  }

  get path() {
    return `cache/${this._key}.json`;
  }

  /**
   * @param {{ strict?: boolean }} [options] strict: throw when the value cannot be read, instead
   *   of answering null as if nothing were cached
   * @returns {Promise<object|null>} The stored item
   */
  async _getRawItem({ strict = false } = {}) {
    try {
      return await storage().private.readJson(this.path);
    } catch (e) {
      if (strict) {
        throw e;
      }

      return null;
    }
  }

  /**
   * @param {{ strict?: boolean }} [options]
   * @returns {Promise<object|null>} The stored item, or null if missing or expired
   */
  async get(options) {
    let item = await this._getRawItem(options);

    // If the cached value is already expired, return null
    if (item && item.expires && new Date(item.expires) < new Date) {
      return null;
    }

    return item;
  }

  /**
   * @param {{ strict?: boolean }} [options]
   * @returns {Promise<unknown>} The stored value, or null if missing or expired
   */
  async getData(options) {
    let item = await this.get(options);

    return item && item.data;
  }

  async getCachedAt() {
    let item = await this._getRawItem();

    return (item && item.cachedAt) ? new Date(item.cachedAt) : null;
  }

  async setData(data, expires = null) {
    let cachedAt = new Date;
    let serialized = JSON.stringify({ expires, data, cachedAt }, undefined, 2);

    await storage().private.writeText(this.path, serialized);
  }
}
