import { createHmac } from 'node:crypto';
import CoralApi from 'nxapi/coral';
import { addUserAgent, setClientAuthentication } from 'nxapi';
import pLimit from 'p-limit';
import ValueCache from '../common/ValueCache.mjs';
import prefixedConsole from '../common/prefixedConsole.mjs';
import { calculateCacheExpiry } from '../common/util.mjs';

const coralLimit = pLimit(1);
const webServiceLimit = pLimit(1);

let _nxapiInitialized = false;

class SharedSecretAssertionProvider {
  constructor(clientId, sharedSecret) {
    this.clientId = clientId;
    this.sharedSecret = sharedSecret;
    this.scope = 'ca:gf ca:er ca:dr';
  }

  async create(aud, exp = 300) {
    const now = Math.floor(Date.now() / 1000);

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      typ: 'client_assertion',
      iss: this.clientId,
      aud,
      exp: now + exp,
      iat: now,
    })).toString('base64url');

    const signData = `${header}.${payload}`;
    const signature = createHmac('sha256', this.sharedSecret)
      .update(signData)
      .digest()
      .toString('base64url');

    return {
      assertion: `${signData}.${signature}`,
      type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    };
  }
}

function initializeNxapi() {
  if (!_nxapiInitialized) {
    addUserAgent(process.env.USER_AGENT);

    if (process.env.NXAPI_CLIENT_ID && process.env.NXAPI_SHARED_SECRET) {
      setClientAuthentication(
        new SharedSecretAssertionProvider(process.env.NXAPI_CLIENT_ID, process.env.NXAPI_SHARED_SECRET),
      );
    }
  }

  _nxapiInitialized = true;
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

export default class NsoClient
{
  constructor(region, nintendoToken) {
    initializeNxapi();

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

  // Coral API

  _getCoralCache() {
    return new ValueCache(`${this.cachePrefix}.coral`);
  }

  async getCoralApi(useCache = true) {
    return coralLimit(async () => {
      let data = useCache
        ? await this._getCoralCache().getData()
        : null;

      if (!data) {
        data = await this._createCoralSession();
      }

      return CoralApi.createWithSavedToken(data);
    });
  }

  async _createCoralSession() {
    this.console.info('Creating Coral session...');
    let { data } = await CoralApi.createWithSessionToken(this.nintendoToken);

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
    return webServiceLimit(async () => {
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
    let coral = await this.getCoralApi();

    this.console.info(`Creating web service token for ID ${id}...`);
    let { result } = await coral.getWebServiceToken(id);

    let expires = calculateCacheExpiry(result.expiresIn);
    this.console.debug(`Caching web service token for ID ${id} until: ${expires}`);
    await tokenCache.setData(result, expires);

    return result;
  }
}
