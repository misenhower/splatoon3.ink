import Media from '../Media.mjs';
import { useUSSplatfestsStore, useEUSplatfestsStore, useJPSplatfestsStore, useAPSplatfestsStore } from '../../../src/stores/splatfests.mjs';
import ScreenshotHelper from '../../screenshots/ScreenshotHelper.mjs';
import StatusGenerator from './StatusGenerator.mjs';

export default class SplatfestResultsStatus extends StatusGenerator
{
  key = 'splatfestResults';
  name = 'Splatfest Results';

  constructor(region, options = {}) {
    super(options);
    this.region = region;
    this.key += `.${region}`;
    this.name += ` (${region})`;
  }

  async getFestival() {
    await this.preparePinia();

    let store;
    switch(this.region) {
      case 'NA': store = useUSSplatfestsStore(this.pinia); break;
      case 'EU': store = useEUSplatfestsStore(this.pinia); break;
      case 'JP': store = useJPSplatfestsStore(this.pinia); break;
      case 'AP': store = useAPSplatfestsStore(this.pinia); break;
    }

    return store.recentFestival;
  }

  async getDataTime() {
    let festival = await this.getFestival();

    if (!festival || !festival.hasResults) {
      return false;
    }

    return Date.parse(festival.endTime);
  }

  async _getStatus() {
    let festival = await this.getFestival();

    if (!festival || !festival.hasResults) {
      return false;
    }

    let winningTeam = festival.teams.find(t => t.result.isWinner);

    const global = festival.regions.length == 4;
    const regionText = global ? this.t('festival.globalResults') : festival.regions.join('/');

    return this.t('festival.results', { region: regionText, team: this.game('festivals', festival, `teams.${festival.teams.indexOf(winningTeam)}.teamName`) });
  }

  async shouldPost(client) {
    let festival = await this.getFestival();

    if (festival?.regions[0] !== this.region) {
      return false;
    }

    return super.shouldPost(client);
  }

  async _getContentWrapper() {
    let festival = await this.getFestival();

    if (!festival || !festival.hasResults) {
      return false;
    }

    return this.t('festival.resultsWrapper', { title: this.game('festivals', festival, 'title') });
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture(`splatfest/${this.region}`);

    return media;
  }
}
