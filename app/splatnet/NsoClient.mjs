import pLimit from 'p-limit';
import ValueCache from '../common/ValueCache.mjs';
import prefixedConsole from '../common/prefixedConsole.mjs';
import { calculateCacheExpiry } from '../common/util.mjs';
import { getRemoteConfig, getWebServiceToken, loginWithSessionToken, ZncaApiClient } from './coral.mjs';

// Serialize logins and token creation per account. Keyed by account rather than global: in
// the Worker each account belongs to one RegionAuth Durable Object, and promises must not be
// shared between Durable Objects in the same isolate.
const accountLimits = new Map();

function accountLimit(account, name) {
  let key = `${account}:${name}`;

  if (!accountLimits.has(key)) {
    accountLimits.set(key, pLimit(1));
  }

  return accountLimits.get(key);
}

// nxapi's remote config can disable Coral authentication, so refresh it regularly rather than
// keeping it for the life of the process (the old Node container restarted daily for this).
const remoteConfigLifetime = { min: 10 * 60, default: 60 * 60, max: 24 * 60 * 60 };

// One znca-api client per Nintendo account: its access token becomes bound to the first
// account that uses it, so clients cannot be shared between regions.
const zncaClients = new Map();

function userAgent() {
  return ['splatoon3.ink', process.env.USER_AGENT].filter(Boolean).join(' ');
}

function remoteConfigExpiry(cacheControl) {
  let maxAge = Number(/max-age=(\d+)/.exec(cacheControl ?? '')?.[1]);
  let seconds = Number.isFinite(maxAge) ? maxAge : remoteConfigLifetime.default;
  seconds = Math.min(Math.max(seconds, remoteConfigLifetime.min), remoteConfigLifetime.max);

  return Date.now() + seconds * 1000;
}

/**
 * The znca-api client (f generation and Coral request encryption) selected by nxapi's remote
 * configuration, plus the Nintendo Switch Online app version to present.
 * @param {string} account Identifies the Nintendo account the client will be used for
 * @returns {Promise<{ znca: ZncaApiClient, zncaVersion: string }>} The client and app version
 */
export async function getZnca(account) {
  let cache = new ValueCache('nxapi.config');
  let config = await cache.getData();

  if (!config) {
    config = await getRemoteConfig(userAgent());
    await cache.setData(config, remoteConfigExpiry(config.cacheControl));
  }

  if (!process.env.NXAPI_CLIENT_ID || !process.env.NXAPI_SHARED_SECRET) {
    throw new Error('NXAPI_CLIENT_ID and NXAPI_SHARED_SECRET are required for Coral authentication');
  }

  // Reuse the account's client (and its znca-api token) while the configuration is unchanged.
  let zncaClient = zncaClients.get(account);

  if (zncaClient?.configUrl !== config.zncaApiUrl || zncaClient?.zncaVersion !== config.zncaVersion) {
    zncaClient = new ZncaApiClient({
      url: config.zncaApiUrl,
      clientId: process.env.NXAPI_CLIENT_ID,
      sharedSecret: process.env.NXAPI_SHARED_SECRET,
      zncaVersion: config.zncaVersion,
      userAgent: userAgent(),
    });
    zncaClient.configUrl = config.zncaApiUrl;
    zncaClients.set(account, zncaClient);
  }

  return { znca: zncaClient, zncaVersion: config.zncaVersion };
}

export function regionTokens() {
  return {
    US: process.env.NINTENDO_TOKEN_US,
    EU: process.env.NINTENDO_TOKEN_EU,
    JP: process.env.NINTENDO_TOKEN_JP,
    AP: process.env.NINTENDO_TOKEN_AP,
  };
}

function getDefaultRegion() {
  for (const [region, token] of Object.entries(regionTokens())) {
    if (token) return region;
  }

  throw new Error('Session token not set for any region');
}

function isCoralSession(data) {
  return !!(data?.coralUserId && data.credential?.accessToken && data.user?.id);
}

export default class NsoClient
{
  constructor(region, nintendoToken) {
    this.console = prefixedConsole('NSO', region);
    this.region = region;
    this.nintendoToken = nintendoToken;
  }

  static make(region = null) {
    region ??= getDefaultRegion();
    let tokens = regionTokens();

    if (!Object.keys(tokens).includes(region)) {
      throw new Error(`Invalid region: ${region}`);
    }

    return new NsoClient(region, tokens[region]);
  }

  get cachePrefix() {
    let token = this.nintendoToken.slice(-8);

    return `nso.${token}`;
  }

  // Coral session

  _getCoralCache() {
    return new ValueCache(`${this.cachePrefix}.coral`);
  }

  /**
   * @param {boolean} [useCache] false to log in again
   * @returns {Promise<{ user: object, coralUserId: number, credential: { accessToken: string, expiresIn: number } }>} The Coral session
   */
  async getCoralSession(useCache = true) {
    return accountLimit(this.cachePrefix, 'coral')(async () => {
      let data = useCache
        ? await this._getCoralCache().getData()
        : null;

      // Sessions cached by the nxapi package have a different shape; log in again.
      if (!isCoralSession(data)) {
        data = await this._createCoralSession();
      }

      return data;
    });
  }

  async _createCoralSession() {
    this.console.info('Creating Coral session...');
    let { znca, zncaVersion } = await getZnca(this.cachePrefix);
    let data = await loginWithSessionToken(this.nintendoToken, { znca, zncaVersion });

    let expires = calculateCacheExpiry(data.credential.expiresIn);
    this.console.debug(`Caching Coral session until: ${expires}`);
    await this._getCoralCache().setData(data, expires);

    return data;
  }

  // Web service tokens

  _getWebServiceTokenCache(id) {
    return new ValueCache(`${this.cachePrefix}.webservicetoken.${id}`);
  }

  async getWebServiceToken(id, useCache = true) {
    return accountLimit(this.cachePrefix, 'webServiceToken')(async () => {
      let tokenCache = this._getWebServiceTokenCache(id);
      let token = useCache
        ? await tokenCache.getData()
        : null;

      if (!token) {
        token = await this._createWebServiceToken(id, tokenCache);
      }

      return token.accessToken;
    });
  }

  async _createWebServiceToken(id, tokenCache) {
    let session = await this.getCoralSession();
    let { znca, zncaVersion } = await getZnca(this.cachePrefix);

    this.console.info(`Creating web service token for ID ${id}...`);
    let result = await getWebServiceToken(id, {
      znca,
      zncaVersion,
      coralAccessToken: session.credential.accessToken,
      coralUserId: session.coralUserId,
      naId: session.user.id,
    });

    let expires = calculateCacheExpiry(result.expiresIn);
    this.console.debug(`Caching web service token for ID ${id} until: ${expires}`);
    await tokenCache.setData(result, expires);

    return result;
  }
}
