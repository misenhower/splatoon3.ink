import StatusGenerator from "./StatusGenerator.mjs";
import Media from "../Media.mjs";
import { useUSSplatfestsStore, useEUSplatfestsStore, useJPSplatfestsStore, useAPSplatfestsStore } from '../../../src/stores/splatfests.mjs';
import ValueCache from '../../common/ValueCache.mjs';

export default class SplatfestResultsStatus extends StatusGenerator
{
  key = 'splatfestResults';
  name = 'Splatfest Results';

  SplatfestStatus(region) {
    this.region = region;
  }

  lastPostCache(client) {
    // let US be no suffix for backwards compatibility
    const regionSuffix = this.region === 'NA' ? '' : `.${this.region}`;
    return new ValueCache(`social.${client.key}.${this.key}${regionSuffix}`);
  }

  async getFestival() {
    await this.preparePinia();

    let store;
    switch(this.region) {
      case "NA": store = useUSSplatfestsStore(); break;
      case "EU": store = useEUSplatfestsStore(); break;
      case "JP": store = useJPSplatfestsStore(); break;
      case "AP": store = useAPSplatfestsStore(); break;
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

    return `Splatfest results: Team ${winningTeam.teamName} wins! #splatfest #splatoon3`;
  }

  async shouldPost(client) {
    let festival = await this.getFestival();
    let regions = festival.__splatoon3ink_id.split("-")[0];
    switch(this.region) {
      // PRIORITY - US, EU, JP, AP
      case "NA": break;
      case "EU": if(regions.includes("U")) return false; break;
      case "JP": if(regions.includes("U") || regions.includes("E")) return false; break;
      case "AP": if(regions.includes("U") || regions.includes("E") || regions.includes("J")) return false; break;
    }

    return super.shouldPost(client);

  }

  async _getContentWrapper() {
    let festival = await this.getFestival();

    if (!festival || !festival.hasResults) {
      return false;
    }

    return `${festival.title} Splatfest Results`;
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture(`splatfest/${this.region}`);

    return media;
  }
}
