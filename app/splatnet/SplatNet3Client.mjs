import pLimit from 'p-limit';
import prefixedConsole from '../common/prefixedConsole.mjs';
import { auth, SPLATNET3_WEB_SERVICE_ID } from './auth.mjs';
// Data from: https://github.com/imink-app/SplatNet3/blob/master/Data/splatnet3_webview_data.json
import bundledQueryHashes from './queryHashes.json' with { type: 'json' };

export { SPLATNET3_WEB_SERVICE_ID };

// Concurrent request limit
const limit = pLimit(5);

export default class SplatNet3Client
{
  baseUrl = 'https://api.lp1.av5ja.srv.nintendo.net';
  bulletToken = null;
  queryHashes = bundledQueryHashes;

  constructor(nsoClient, acceptLanguage = 'en-US') {
    this.console = prefixedConsole('SplatNet', nsoClient.region);
    this.nsoClient = nsoClient;
    this.acceptLanguage = acceptLanguage;
  }

  get hasSession() {
    return !!this.bulletToken;
  }

  // Query hashes

  async _webViewVersion() {
    return this.queryHashes?.version;
  }

  async _queryHash(name) {
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

  /**
   * Shared per account; see auth.mjs.
   * @param {boolean} [useCache] false to obtain a fresh token
   * @returns {Promise<object>} The bullet token response
   */
  getBulletToken(useCache = true) {
    return auth().bulletToken(this.nsoClient, { language: this.acceptLanguage, useCache });
  }

  // GraphQL

  async getGraphQL(body = {}) {
    await this._maybeStartSession();
    let webViewVersion = await this._webViewVersion();

    let response = await limit(() => fetch(this.baseUrl + '/api/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.bulletToken.bulletToken}`,
        'X-Web-View-Ver': webViewVersion,
        'Content-Type': 'application/json',
        'Accept-Language': this.acceptLanguage,
      },
      body: JSON.stringify(body),
    }));

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

  getFestRecordDataPage(cursor = null) {
    return this.getGraphQLPersistedQuery(1, 'FestRecordPaginationQuery', { cursor, first: 100 });
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
