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

  async _getRawItem() {
    try {
      return await storage().private.readJson(this.path);
    } catch {
      return null;
    }
  }

  async get() {
    let item = await this._getRawItem();

    // If the cached value is already expired, return null
    if (item && item.expires && new Date(item.expires) < new Date) {
      return null;
    }

    return item;
  }

  async getData() {
    let item = await this.get();

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
