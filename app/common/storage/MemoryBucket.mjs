// In-memory bucket with the subset of the R2 binding API the app uses. For tests.

function toBytes(value) {
  if (typeof value === 'string') {
    return new TextEncoder().encode(value);
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice();
  }

  throw new TypeError('MemoryBucket.put: unsupported value type');
}

export default class MemoryBucket {
  objects = new Map();

  async head(key) {
    let object = this.objects.get(key);

    return object
      ? { key, size: object.bytes.byteLength, uploaded: object.uploaded, httpMetadata: object.httpMetadata }
      : null;
  }

  async get(key) {
    let object = this.objects.get(key);

    if (!object) {
      return null;
    }

    let bytes = object.bytes;

    return {
      key,
      size: bytes.byteLength,
      uploaded: object.uploaded,
      httpMetadata: object.httpMetadata,
      json: async () => JSON.parse(new TextDecoder().decode(bytes)),
      text: async () => new TextDecoder().decode(bytes),
      arrayBuffer: async () => bytes.slice().buffer,
    };
  }

  async put(key, value, options = {}) {
    let bytes = value instanceof ReadableStream
      ? new Uint8Array(await new Response(value).arrayBuffer())
      : toBytes(value);

    this.objects.set(key, { bytes, uploaded: new Date(), httpMetadata: options.httpMetadata ?? {} });

    return { key };
  }

  async delete(keys) {
    for (let key of [].concat(keys)) {
      this.objects.delete(key);
    }
  }

  async list({ prefix = '', cursor, limit = 1000 } = {}) {
    let keys = [...this.objects.keys()].filter(key => key.startsWith(prefix)).sort();
    let start = cursor ? Number(cursor) : 0;
    let page = keys.slice(start, start + limit);
    let truncated = start + limit < keys.length;

    return {
      objects: page.map(key => ({
        key,
        size: this.objects.get(key).bytes.byteLength,
        uploaded: this.objects.get(key).uploaded,
      })),
      truncated,
      cursor: truncated ? String(start + limit) : undefined,
    };
  }

  // Test helpers

  text(key) {
    let object = this.objects.get(key);

    return object ? new TextDecoder().decode(object.bytes) : undefined;
  }

  json(key) {
    let text = this.text(key);

    return text === undefined ? undefined : JSON.parse(text);
  }
}
