import ValueCache from "../common/ValueCache.mjs";
import NsoClient from "./NsoClient.mjs";
import prefixedConsole from '../common/prefixedConsole.mjs';

export const SPLATNET3_WEB_SERVICE_ID = '4834290508791808';

export default class SplatNet3Client
{
  baseUrl = 'https://api.lp1.av5ja.srv.nintendo.net';
  webViewVersion = '2.0.0-8a061f6c';
  bulletToken = null;

  constructor(nsoClient, acceptLanguage = 'en-US') {
    this.console = prefixedConsole('SplatNet', nsoClient.region);
    this.nsoClient = nsoClient;
    this.acceptLanguage = acceptLanguage;
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
        'X-GameWebToken': webServiceToken,
        'Accept-Language': this.acceptLanguage,
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
        'Accept-Language': this.acceptLanguage,
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
    return this.getGraphQLPersistedQuery(1, '730cd98e84f1030d3e9ac86b6f1aae13');
  }

  getGesotownData() {
    return this.getGraphQLPersistedQuery(1, 'a43dd44899a09013bcfd29b4b13314ff');
  }

  getCoopHistoryData() {
    return this.getGraphQLPersistedQuery(1, '6ed02537e4a65bbb5e7f4f23092f6154');
  }

  getFestRecordData() {
    return this.getGraphQLPersistedQuery(1, '44c76790b68ca0f3da87f2a3452de986');
  }

  getFestDetailData(festId) {
    return this.getGraphQLPersistedQuery(1, '96c3a7fd484b8d3be08e0a3c99eb2a3d', { festId });
  }

  getFestRankingData(festId) {
    return this.getGraphQLPersistedQuery(1, '4869de13d0d209032b203608cb598aef', { festId });
  }

  getCurrentFestData() {
    return this.getGraphQLPersistedQuery(1, 'c0429fd738d829445e994d3370999764');
  }
}
