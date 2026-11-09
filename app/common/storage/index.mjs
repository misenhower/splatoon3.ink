// Where the backend reads and writes its files.
//
// There are three areas, each with the same small interface (see BucketStorage):
//   - public:  what the site serves (data/*.json, data/*.ics, splatnet/* images, status-screenshots/*)
//   - private: tokens and other state (cache/*.json)
//   - archive: hourly data snapshots
//
// Keys are the R2 object keys. The Node runner maps them onto dist/ and storage/ (see
// filesystem.mjs); the Worker uses R2 bindings. Storage is configured once per process or
// isolate, because nothing but image existence is cached between calls.
//
// FilesystemStorage is deliberately not re-exported: it imports node:fs, and this module is
// part of the Worker's import graph.

export { default as BucketStorage } from './BucketStorage.mjs';
export { default as MemoryBucket } from './MemoryBucket.mjs';

export { contentTypeFor, DATA_CACHE_CONTROL } from './metadata.mjs';

let configured = null;

/**
 * @param {{ public: object, private: object, archive: object }} areas BucketStorage or FilesystemStorage instances
 */
export function configureStorage(areas) {
  for (let name of ['public', 'private', 'archive']) {
    if (!areas?.[name]) {
      throw new Error(`Missing ${name} storage`);
    }
  }

  configured = areas;
}

/**
 * @returns {{ public: object, private: object, archive: object }} The configured storage areas
 */
export function storage() {
  if (!configured) {
    throw new Error('Storage is not configured; call configureStorage() at startup');
  }

  return configured;
}
