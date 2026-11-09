import { BucketStorage, MemoryBucket, configureStorage } from '../common/storage/index.mjs';

let buckets;

/** Give each test fresh in-memory storage; returns the underlying buckets for assertions. */
export function useMemoryStorage() {
  buckets = { public: new MemoryBucket, private: new MemoryBucket, archive: new MemoryBucket };

  configureStorage({
    public: new BucketStorage(buckets.public, { publicUrl: 'https://assets.test' }),
    private: new BucketStorage(buckets.private),
    archive: new BucketStorage(buckets.archive),
  });

  return buckets;
}

/** The memory buckets behind the current test's storage. */
export function testBuckets() {
  return buckets;
}
