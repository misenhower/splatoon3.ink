// Connects the shared app/ code to this Worker's bindings. The Node runner does the same with
// local directories (app/common/storage/filesystem.mjs) and in-process auth.

import { BucketStorage, configureStorage } from '../../../app/common/storage/index.mjs';
import { configureAuth } from '../../../app/splatnet/auth.mjs';
import { configureScreenshots } from '../../../app/screenshots/ScreenshotHelper.mjs';

export const REGIONS = ['US', 'EU', 'JP', 'AP'];

// Archives move to DigitalOcean Spaces in a later step; until then ARCHIVE_DATA stays unset.
class UnconfiguredArchive {
  #fail() {
    throw new Error('Archive storage is not configured for this Worker');
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
    archive: new UnconfiguredArchive,
  });
  configureAuth(regionAuthProvider(env));
  configureScreenshots({ provider: 'cloudflare', browser: env.BROWSER });

  configuredFor = env.ASSETS;
}
