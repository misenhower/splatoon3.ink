import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

class VirtualFileSystem {
  // Map of S3 key to { lastModified: Date, size: number }
  _listing = new Map();
  _loaded = false;
  _trackedPrefixes = [];
  _localPrefix = 'dist';

  get _canUseS3() {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET
    );
  }

  get _s3Client() {
    return this.__s3Client ??= new S3Client({
      endpoint: process.env.AWS_S3_ENDPOINT,
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  /**
   * Load S3 listing for the given prefixes.
   * Call once at startup before any exists/olderThan checks.
   * @param {string[]} prefixes
   */
  async loadFromS3(prefixes) {
    if (!this._canUseS3) {
      return;
    }

    this._trackedPrefixes = prefixes;
    const bucket = process.env.AWS_S3_BUCKET;

    console.log('[VFS] Loading S3 listing...');

    for (const prefix of prefixes) {
      let continuationToken;
      let count = 0;

      do {
        const response = await this._s3Client.send(new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }));

        for (const obj of response.Contents ?? []) {
          this._listing.set(obj.Key, {
            lastModified: obj.LastModified,
            size: obj.Size,
          });
          count++;
        }

        continuationToken = response.IsTruncated
          ? response.NextContinuationToken
          : undefined;
      } while (continuationToken);

      console.log(`[VFS] Loaded ${count} entries for prefix "${prefix}"`);
    }

    this._loaded = true;
  }

  /**
   * Check if a local file path is known to exist in the VFS listing.
   * Returns true/false if the path is within a tracked prefix,
   * or null if VFS has no opinion (not loaded, or path outside tracked prefixes).
   * @param {string} localPath
   */
  has(localPath) {
    if (!this._loaded) return null;

    const key = this._localPathToKey(localPath);
    if (key === null) return null;
    if (!this._isTrackedKey(key)) return null;

    return this._listing.has(key);
  }

  /**
   * Get the last modified time for a file from the S3 listing.
   * Returns Date if found, null if not tracked or VFS not loaded.
   * @param {string} localPath
   */
  getMtime(localPath) {
    if (!this._loaded) return null;

    const key = this._localPathToKey(localPath);
    if (key === null) return null;
    if (!this._isTrackedKey(key)) return null;

    const entry = this._listing.get(key);
    return entry ? entry.lastModified : null;
  }

  /**
   * Convert a local path (e.g. 'dist/assets/splatnet/foo.png')
   * to an S3 key (e.g. 'assets/splatnet/foo.png').
   * @param {string} localPath
   */
  _localPathToKey(localPath) {
    const prefix = this._localPrefix + '/';
    if (localPath.startsWith(prefix)) {
      return localPath.slice(prefix.length);
    }
    return null;
  }

  _isTrackedKey(key) {
    return this._trackedPrefixes.some(prefix => key.startsWith(prefix));
  }
}

const vfs = new VirtualFileSystem();
export default vfs;
