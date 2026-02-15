import fs from 'fs/promises';
import path from 'path';
import { mkdirp } from './fs.mjs';
export default class ValueCache
{
  constructor(key) {
    this._key = key;
  }

  get path() {
    return `storage/cache/${this._key}.json`;
  }

  async _getRawItem() {
    try {
      let data = await fs.readFile(this.path);

      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  async get() {
    let item = await this._getRawItem();

    // If the cached value is already expired, return null
    if (item && item.expires && item.expires < new Date) {
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

    await mkdirp(path.dirname(this.path));
    await fs.writeFile(this.path, serialized);
  }
}
