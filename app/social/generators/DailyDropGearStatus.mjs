import StatusGenerator from "./StatusGenerator.mjs";
import Media from "../Media.mjs";
import { useGearStore } from "../../../src/stores/gear.mjs";
import { getGearIcon } from "../../common/util.mjs";

export default class DailyDropGearStatus extends StatusGenerator
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

    // We only have end times for gear, so use that to track the status time
    return Date.parse(brand.saleEndTime);
  }

  async _getStatus() {
    let { brand, gears } = await this.getData();

    let formattedGears = gears.map(gear => {
      let icon = getGearIcon(gear);
      let name = gear.gear.name;
      let power = gear.gear.primaryGearPower.name;

      return `${icon} ${name} with ${power}`;
    }).join('\n');

    return [
      `The Daily Drop: Today's featured brand is ${brand.brand.name}! #dailydrop`,
      '',
      formattedGears,
      // '',
      // `🛒 Order: https://splatoon3.ink/nso/g/`
    ].join('\n');
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture('gear/dailydrop');

    return media;
  }
}
