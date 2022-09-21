import TweetGenerator from "./TweetGenerator.mjs";
import Media from "../Media.mjs";
import { useGearStore } from "../../../src/stores/gear.mjs";

export default class DailyDropGearTweet extends TweetGenerator
{
  key = 'gear.dailydrop';
  name = 'Daily Drop Gear';

  async getData() {
    await this.preparePinia();
    let brand = useGearStore().dailyDropBrand;
    let gears = useGearStore().dailyDropGear;

    return { brand, gears };
  }

  async getDataTime() {
    let { brand } = await this.getData();

    // We only have end times for gear, so use that to track the tweet time
    return Date.parse(brand.saleEndTime);
  }

  async _getStatus() {
    let { brand } = await this.getData();

    return `The Daily Drop: Today's featured brand is ${brand.brand.name}! #dailydrop`
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture('gear/dailydrop');

    return media;
  }
}
