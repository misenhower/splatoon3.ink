import pLimit from 'p-limit';
import ValueCache from '../common/ValueCache.mjs';
import prefixedConsole from '../common/prefixedConsole.mjs';
import { calculateCacheExpiry } from '../common/util.mjs';
import queryHashes from './queryHashes.json' with { type: 'json' };

export const SPLATNET3_WEB_SERVICE_ID = '4834290508791808';
const SPLATNET3_BASE_URL = 'https://api.lp1.av5ja.srv.nintendo.net';

// Serialize token acquisition per account (NSO session token), across all callers.
const bulletTokenLimits = new Map();

/**
 * Obtains SplatNet 3 bullet tokens: Nintendo Account → Coral → web service token → bullet
 * token, cached in private storage at each step.
 *
 * This runs in-process. The Node runner uses it directly; in the Worker, each region's
 * RegionAuth Durable Object runs this same code so that parallel updaters share one token
 * and never log in at the same time.
 */
export class LocalAuth {
  /**
   * @param {import('./NsoClient.mjs').default} nsoClient
   * @param {object} [options]
   * @param {string} [options.language] Accept-Language for a newly created token
   * @param {boolean} [options.useCache] false to obtain a fresh token
   */
  bulletToken(nsoClient, { language = 'en-US', useCache = true } = {}) {
    const key = nsoClient.cachePrefix;
    let tokenLimit = bulletTokenLimits.get(key);

    if (!tokenLimit) {
      tokenLimit = pLimit(1);
      bulletTokenLimits.set(key, tokenLimit);
    }

    return tokenLimit(async () => {
      let bulletTokenCache = new ValueCache(`${key}.bulletToken`);

      let bulletToken = useCache
        ? await bulletTokenCache.getData()
        : null;

      if (!bulletToken) {
        let webServiceToken = await nsoClient.getWebServiceToken(SPLATNET3_WEB_SERVICE_ID);
        bulletToken = await this._createBulletToken(nsoClient, webServiceToken, language, bulletTokenCache);
      }

      return bulletToken;
    });
  }

  /**
   * Renew every credential for the account ahead of time, bypassing the caches.
   * @param {import('./NsoClient.mjs').default} nsoClient
   */
  async refresh(nsoClient) {
    await safe(() => nsoClient.getCoralSession(false));
    await safe(() => nsoClient.getWebServiceToken(SPLATNET3_WEB_SERVICE_ID, false));
    await safe(() => this.bulletToken(nsoClient, { useCache: false }));
  }

  async _createBulletToken(nsoClient, webServiceToken, language, bulletTokenCache) {
    const console = prefixedConsole('SplatNet', nsoClient.region);
    console.info('Creating bullet token...');

    let response = await fetch(SPLATNET3_BASE_URL + '/api/bullet_tokens', {
      method: 'POST',
      headers: {
        'X-Web-View-Ver': queryHashes.version,
        'X-NACOUNTRY': 'US', // TODO
        'X-GameWebToken': webServiceToken,
        'Accept-Language': language,
        'User-Agent': process.env.USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Invalid bullet token response code: ${response.status}`);
    }

    let bulletToken = await response.json();

    // We can assume the token expires after 7200 seconds
    let expiry = calculateCacheExpiry(7200);
    await bulletTokenCache.setData(bulletToken, expiry);

    console.debug(`Caching bullet token until: ${expiry}`);

    return bulletToken;
  }
}

async function safe(callable) {
  try {
    await callable();
  } catch (e) {
    console.error(e);
  }
}

let provider = null;

/**
 * Replace the token provider (the Worker routes requests to RegionAuth Durable Objects).
 * @param {object|null} auth An object with bulletToken() and refresh(), or null for LocalAuth
 */
export function configureAuth(auth) {
  provider = auth;
}

/**
 * @returns {LocalAuth} The configured token provider (LocalAuth or an equivalent)
 */
export function auth() {
  return provider ??= new LocalAuth;
}
