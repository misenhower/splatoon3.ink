import StatusGenerator from "./StatusGenerator.mjs";
import Media from "../Media.mjs";
import { useUSSplatfestsStore } from '../../../src/stores/splatfests.mjs';

export default class SplatfestResultsStatus extends StatusGenerator
{
  key = 'splatfestResults';
  name = 'Splatfest Results';

  async getFestival() {
    await this.preparePinia();

    return useUSSplatfestsStore().recentFestival;
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

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture('splatfest');

    return media;
  }
}
