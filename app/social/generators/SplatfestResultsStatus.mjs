import Media from "../Media.mjs";
import { useUSSplatfestsStore, useEUSplatfestsStore, useJPSplatfestsStore, useAPSplatfestsStore } from '../../../src/stores/splatfests.mjs';
import ScreenshotHelper from "../../screenshots/ScreenshotHelper.mjs";
import StatusGenerator from "./StatusGenerator.mjs";

export default class SplatfestResultsStatus extends StatusGenerator
{
  key = 'splatfestResults';
  name = 'Splatfest Results';

  constructor(region) {
    super();
    this.region = region;
    this.key += `.${region}`;
    this.name += ` (${region})`;
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

    const global = festival.regions.length == 4;
    const regionText = global ? 'Global' : festival.regions.join("/");

    return `${regionText} Splatfest results: Team ${winningTeam.teamName} wins! #splatfest #splatoon3`;
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

    return `${festival.title} Splatfest Results`;
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture(`splatfest/${this.region}`);

    return media;
  }
}
