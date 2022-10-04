import TweetGenerator from "./TweetGenerator.mjs";
import Media from "../Media.mjs";
import { useGearStore } from "../../../src/stores/gear.mjs";

export default class RegularGearTweet extends TweetGenerator
{
  key = 'gear.regular';
  name = 'Regular Gear';

  async getLatestGear() {
    await this.preparePinia();

    return useGearStore().regularGear?.slice().reverse()[0];
  }

  async getDataTime() {
    let gear = await this.getLatestGear();

    // We only have end times for gear, so use that to track the tweet time
    return Date.parse(gear.saleEndTime);
  }

  async _getStatus() {
    let gear = await this.getLatestGear();

    let url = `https://splatoon3.ink/nso/g/${gear.id}`;

    return `Up now on SplatNet: ${gear.gear.name} with ${gear.gear.primaryGearPower.name}. Order: ${url} #splatnet3`;
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture('gear/regular');

    return media;
  }
}
