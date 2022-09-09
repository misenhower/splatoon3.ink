import CoralApi from 'nxapi/coral';
import { addUserAgent } from "nxapi";
import ValueCache from '../common/ValueCache.mjs';

let _nxapiInitialized = false;

function initializeNxapi() {
  if (!_nxapiInitialized) {
    addUserAgent(process.env.USER_AGENT);
  }

  _nxapiInitialized = true;
}

export default class NsoClient
{
  constructor(nintendoToken = null) {
    initializeNxapi();

    this.nintendoToken = nintendoToken || process.env.NINTENDO_TOKEN;
  }

  get cachePrefix() {
    let token = this.nintendoToken.slice(-8);

    return `nso.${token}`;
  }

  _calculateCacheExpiry(expiresIn) {
    let expires = Date.now() + expiresIn * 1000;

    // Expire 5min early to make sure we have time to execute requests
    return expires - 5 * 60 * 1000;
  }

  // Coral API

  _getCoralCache() {
    return new ValueCache(`${this.cachePrefix}.coral`);
  }

  async getCoralApi() {
    let data = await this._getCoralCache().getData();

    if (!data) {
      data = await this._createCoralSession();
    }

    return CoralApi.createWithSavedToken(data);
  }

  async _createCoralSession() {
    console.debug('Creating Coral session');
    let { data } = await CoralApi.createWithSessionToken(this.nintendoToken);

    let expires = this._calculateCacheExpiry(data.credential.expiresIn);
    console.debug(`Caching Coral session until: ${expires}`);
    await this._getCoralCache().setData(data, expires);

    return data;
  }

  // Web service tokens

  _getWebServiceTokenCache(id) {
    return new ValueCache(`${this.cachePrefix}.webservicetoken.${id}`);
  }

  async getWebServiceToken(id) {
    let tokenCache = this._getWebServiceTokenCache(id);
    let token = await tokenCache.getData();

    if (!token) {
      token = await this._createWebServiceToken(id, tokenCache);
    }

    return token.accessToken;
  }

  async _createWebServiceToken(id, tokenCache) {
    let coral = await this.getCoralApi();

    console.debug(`Creating web service token for ID ${id}`);
    let { result } = await coral.getWebServiceToken(id);

    let expires = this._calculateCacheExpiry(result.expiresIn);
    console.debug(`Caching web service token for ID ${id} until: ${expires}`);
    await tokenCache.setData(result, expires);

    return result;
  }
}
