import ValueCache from "../common/ValueCache.mjs";
import prefixedConsole from '../common/prefixedConsole.mjs';
import fs from 'fs/promises';

export const SPLATNET3_WEB_SERVICE_ID = '4834290508791808';

export default class SplatNet3Client
{
  baseUrl = 'https://api.lp1.av5ja.srv.nintendo.net';
  bulletToken = null;
  queryHashes = null;

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

  // Query hashes
  async _loadQueryHashes() {
    if (!this.queryHashes) {
      // Data from: https://github.com/imink-app/SplatNet3/blob/master/Data/splatnet3_webview_data.json
      let data = await fs.readFile(new URL('./queryHashes.json', import.meta.url));
      this.queryHashes = JSON.parse(data);
    }
  }

  async _webViewVersion() {
    await this._loadQueryHashes();

    return this.queryHashes?.version;
  }

  async _queryHash(name) {
    await this._loadQueryHashes();

    return this.queryHashes?.graphql?.hash_map?.[name];
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
        'X-Web-View-Ver': await this._webViewVersion(),
        'X-NACOUNTRY': 'US', // TODO
        'X-GameWebToken': webServiceToken,
        'Accept-Language': this.acceptLanguage,
      },
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
        'X-Web-View-Ver': await this._webViewVersion(),
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

  async getGraphQLPersistedQuery(version, query, variables = {}) {
    let sha256Hash = await this._queryHash(query) ?? query;

    let body = {
      extensions: { persistedQuery: { version, sha256Hash } },
      variables,
    };

    return await this.getGraphQL(body);
  }

  // Specific queries

  getStageScheduleData() {
    return this.getGraphQLPersistedQuery(1, 'StageScheduleQuery');
  }

  getStageRecordData() {
    return this.getGraphQLPersistedQuery(1, 'StageRecordQuery');
  }

  getGesotownData() {
    return this.getGraphQLPersistedQuery(1, 'GesotownQuery');
  }

  getCoopHistoryData() {
    return this.getGraphQLPersistedQuery(1, 'CoopHistoryQuery');
  }

  getFestRecordData() {
    return this.getGraphQLPersistedQuery(1, 'FestRecordQuery');
  }

  getFestDetailData(festId) {
    return this.getGraphQLPersistedQuery(1, 'DetailFestRecordDetailQuery', { festId });
  }

  getFestRankingData(festId) {
    return this.getGraphQLPersistedQuery(1, 'DetailRankingQuery', { festId });
  }

  getFestRankingPage(teamId, cursor) {
    return this.getGraphQLPersistedQuery(1, 'RankingHoldersFestTeamRankingHoldersPaginationQuery', { cursor, first: 25, id: teamId });
  }

  getCurrentFestData() {
    return this.getGraphQLPersistedQuery(1, 'useCurrentFestQuery');
  }

  getXRankingData(region) {
    return this.getGraphQLPersistedQuery(1, 'XRankingQuery', { region });
  }

  getXRankingDetailQueryTypes() {
    return [
      {
        name: 'Splat Zones Leaderboard',
        key: 'splatzones',
        id: 'DetailTabViewXRankingArRefetchQuery',
        dataKey: 'xRankingAr',
      },
      {
        name: 'Splat Zones Top Weapons',
        key: 'splatzones.weapons',
        id: 'DetailTabViewWeaponTopsArRefetchQuery',
        dataKey: 'weaponTopsAr',
      },
      {
        name: 'Clam Blitz Leaderboard',
        key: 'clamblitz',
        id: 'DetailTabViewXRankingClRefetchQuery',
        dataKey: 'xRankingCl',
      },
      {
        name: 'Clam Blitz Top Weapons',
        key: 'clamblitz.weapons',
        id: 'DetailTabViewWeaponTopsClRefetchQuery',
        dataKey: 'weaponTopsCl',
      },
      {
        name: 'Rainmaker Leaderboard',
        key: 'rainmaker',
        id: 'DetailTabViewXRankingGlRefetchQuery',
        dataKey: 'xRankingGl',
      },
      {
        name: 'Rainmaker Top Weapons',
        key: 'rainmaker.weapons',
        id: 'DetailTabViewWeaponTopsGlRefetchQuery',
        dataKey: 'weaponTopsGl',
      },
      {
        name: 'Tower Control Leaderboard',
        key: 'towercontrol',
        id: 'DetailTabViewXRankingLfRefetchQuery',
        dataKey: 'xRankingLf',
      },
      {
        name: 'Tower Control Top Weapons',
        key: 'towercontrol.weapons',
        id: 'DetailTabViewWeaponTopsLfRefetchQuery',
        dataKey: 'weaponTopsLf',
      },
    ];
  }

  getXRankingDetail(type, id, page = 1) {
    // The API splits this data into 5 pages of 100 results (param: "page").
    // Each page is segmented into smaller 25-record chunks (by default) as well (param: "first").
    // We can just pass a larger number (up to 100) into the "first" param
    // to retrieve all results for that page.
    let first = 100;

    return this.getGraphQLPersistedQuery(1, type.id, { id, first, page });
  }

  async *getXRankingDetailPages(type, id) {
    for (let page = 1; page <= 5; page++) {
      yield await this.getXRankingDetail(type, id, page);
    }
  }
}
