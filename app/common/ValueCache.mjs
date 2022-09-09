import fs from 'fs/promises';

export default class ValueCache
{
  constructor(key) {
    this._key = key;
  }

  get path() {
    return `storage/${this._key}.json`;
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

  async setData(data, expires = null) {
    let serialized = JSON.stringify({ expires, data }, undefined, 2);

    await fs.writeFile(this.path, serialized);
  }
}
