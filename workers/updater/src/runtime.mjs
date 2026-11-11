// Connects the shared app/ code to this Worker's bindings. The Node runner does the same with
// local directories (app/common/storage/filesystem.mjs) and in-process auth.

import { BucketStorage, configureStorage, S3ArchiveStorage } from '../../../app/common/storage/index.mjs';
import { configureAuth } from '../../../app/splatnet/auth.mjs';
import { configureScreenshots } from '../../../app/screenshots/ScreenshotHelper.mjs';

export const REGIONS = ['US', 'EU', 'JP', 'AP'];

// Stands in while the archive bucket's settings are missing. Updaters only write snapshots
// when ARCHIVE_DATA is set, and a failed snapshot is a warning, so this never stops an update.
class UnconfiguredArchive {
  #fail() {
    throw new Error('The archive bucket is not configured: set AWS_S3_ENDPOINT, AWS_REGION, '
      + 'AWS_S3_ARCHIVE_BUCKET, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
  }

  exists() { this.#fail(); }
  lastModified() { this.#fail(); }
  readJson() { this.#fail(); }
  readBytes() { this.#fail(); }
  writeText() { this.#fail(); }
  writeBytes() { this.#fail(); }
  delete() { this.#fail(); }
}

/**
 * Data snapshots go straight to the archive bucket on DigitalOcean Spaces, the same bucket
 * layout the Node runner uploads to.
 * @param {object} env Worker environment
 * @returns {object} The archive storage area
 */
export function archiveStorage(env) {
  let settings = {
    endpoint: env.AWS_S3_ENDPOINT,
    region: env.AWS_REGION,
    bucket: env.AWS_S3_ARCHIVE_BUCKET,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  };

  return Object.values(settings).every(Boolean) ? new S3ArchiveStorage(settings) : new UnconfiguredArchive;
}

/**
 * Token requests go to the region's RegionAuth Durable Object, the single owner of its login.
 * @param {object} env Worker environment
 * @returns {object} An auth provider for configureAuth()
 */
export function regionAuthProvider(env) {
  let stub = region => env.REGION_AUTH.getByName(region);

  return {
    bulletToken: (nsoClient, { language, useCache } = {}) =>
      stub(nsoClient.region).bulletToken({ region: nsoClient.region, language, useCache }),
    refresh: nsoClient => stub(nsoClient.region).refresh({ region: nsoClient.region }),
  };
}

let configuredFor = null;

/**
 * Configure the shared code for this isolate. Bindings are the same for every invocation of a
 * deployment, so this only does work once.
 * @param {object} env Worker environment
 */
export function setupRuntime(env) {
  if (configuredFor === env.ASSETS) {
    return;
  }

  configureStorage({
    public: new BucketStorage(env.ASSETS, { publicUrl: env.R2_PUBLIC_URL }),
    private: new BucketStorage(env.PRIVATE),
    archive: archiveStorage(env),
  });
  configureAuth(regionAuthProvider(env));
  configureScreenshots({ provider: 'cloudflare', browser: env.BROWSER });

  configuredFor = env.ASSETS;
}
