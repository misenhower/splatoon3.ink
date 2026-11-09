import prefixedConsole from '../../common/prefixedConsole.mjs';
import { regionTokens } from '../../splatnet/NsoClient.mjs';
import { storage } from '../../common/storage/index.mjs';
import FestivalRankingUpdater from './FestivalRankingUpdater.mjs';

/**
 * Updates the Splatfest top-100 rankings for one region.
 *
 * Rankings are extra data for API consumers; neither the site nor the social posts use them.
 * They run separately from FestivalUpdater (one Splatfest at a time) so that festival results
 * are never held up by ranking pagination. The list of Splatfests comes from the published
 * festivals data, so this should run after FestivalUpdater.
 */
export default class FestivalRankingsUpdater
{
  festivalsKey = 'data/festivals.json';

  settings = {};

  constructor(region) {
    this.region = region;
    this.console = prefixedConsole('Updater', region, 'FestivalRankings');
  }

  async updateIfNeeded() {
    if (this.settings.disableFestivalRankings) {
      return;
    }

    if (!regionTokens()[this.region]) {
      this.console.log(`No token provided for ${this.region} region, skipping...`);

      return;
    }

    for (let fest of await this.getFestivalsWithResults()) {
      let updater = new FestivalRankingUpdater(this.region, fest.id, fest.endTime);

      try {
        await updater.updateIfNeeded();
      } catch (e) {
        this.console.error(e);
      }
    }
  }

  async getFestivalsWithResults() {
    let data = await storage().public.readJson(this.festivalsKey);

    if (!data) {
      this.console.warn('No published festivals data, skipping...');

      return [];
    }

    let nodes = data[this.region]?.data?.festRecords?.nodes ?? [];

    return nodes.filter(fest => fest.teams?.some(team => team.result));
  }
}
