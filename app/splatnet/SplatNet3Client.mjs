import ValueCache from "../common/ValueCache.mjs";
import NsoClient from "./NsoClient.mjs";
import prefixedConsole from '../common/prefixedConsole.mjs';

export const SPLATNET3_WEB_SERVICE_ID = '4834290508791808';

export default class SplatNet3Client
{
  baseUrl = 'https://api.lp1.av5ja.srv.nintendo.net';
  webViewVersion = '1.0.0-5e2bcdfb';
  bulletToken = null;

  constructor(nsoClient = null) {
    this.console = prefixedConsole('SplatNet');
    this.nsoClient = nsoClient ?? new NsoClient;
  }

  get hasSession() {
    return !!this.bulletToken;
  }

  _calculateCacheExpiry(expiresIn) {
    let expires = Date.now() + expiresIn * 1000;

    // Expire 5min early to make sure we have time to execute requests
    return expires - 5 * 60 * 1000;
  }

  // Bullet token

  async _startSession() {
    this.bulletToken = await this.getBulletToken();
  }

  async _maybeStartSession() {
    if (!this.hasSession) {
      await this._startSession();
    }
  }

  async getBulletToken(useCache = true) {
    let bulletTokenCache = new ValueCache(`${this.nsoClient.cachePrefix}.bulletToken`);

    let bulletToken = useCache
      ? await bulletTokenCache.getData()
      : null;

    if (!bulletToken) {
      let webServiceToken = await this.nsoClient.getWebServiceToken(SPLATNET3_WEB_SERVICE_ID);
      bulletToken = await this._createBulletToken(webServiceToken, bulletTokenCache);
    }

    return bulletToken;
  }

  async _createBulletToken(webServiceToken, bulletTokenCache) {
    this.console.info('Creating bullet token...');

    let response = await fetch(this.baseUrl + '/api/bullet_tokens', {
      method: 'POST',
      headers: {
        'X-Web-View-Ver': this.webViewVersion,
        'X-NACOUNTRY': 'US', // TODO
        'X-GameWebToken': webServiceToken
      }
    });

    if (!response.ok) {
      throw new Error(`Invalid bullet token response code: ${response.status}`);
    }

    let bulletToken = await response.json();

    // We can assume the token expires after 7200 seconds
    let expiry = this._calculateCacheExpiry(7200);
    await bulletTokenCache.setData(bulletToken, expiry);

    this.console.debug(`Caching bullet token until: ${expiry}`);

    return bulletToken;
  }

  // GraphQL

  async getGraphQL(body = {}) {
    await this._maybeStartSession();

    let response = await fetch(this.baseUrl + '/api/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.bulletToken.bulletToken}`,
        'X-Web-View-Ver': this.webViewVersion,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Invalid GraphQL response code: ${response.status}`);
    }

    return await response.json();
  }

  async getGraphQLPersistedQuery(version, sha256Hash, variables = {}) {
    let body = {
      extensions: { persistedQuery: { version, sha256Hash } },
      variables,
    };

    return await this.getGraphQL(body);
  }

  // Specific queries

  getStageScheduleData() {
    return this.getGraphQLPersistedQuery(1, '10e1d424391e78d21670227550b3509f');
  }

  getGesotownData() {
    return this.getGraphQLPersistedQuery(1, 'd08dbdd29f31471e61daa978feea697a');
  }

  getCoopHistoryData() {
    return this.getGraphQLPersistedQuery(1, '817618ce39bcf5570f52a97d73301b30');
  }
}
