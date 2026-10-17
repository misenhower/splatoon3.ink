import { useTimeStore } from '../../../src/stores/time.mjs';
import Media from '../Media.mjs';
import { useGearStore } from '../../../src/stores/gear.mjs';
import { getGearIcon } from '../../common/util.mjs';
import ScreenshotHelper from '../../screenshots/ScreenshotHelper.mjs';
import StatusGenerator from './StatusGenerator.mjs';

export default class DailyDropGearStatus extends StatusGenerator
{
  key = 'gear.dailydrop';
  name = 'Daily Drop Gear';

  async getData() {
    await this.preparePinia();
    let brand = useGearStore(this.pinia).dailyDropBrand;
    let gears = useGearStore(this.pinia).dailyDropGear;

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
      let name = this.game('gear', gear.gear);
      let power = this.game('powers', gear.gear.primaryGearPower);

      return this.t('gear.item', { icon, name, power });
    }).join('\n');

    return [
      this.t('gear.daily', { brand: this.game('brands', brand.brand) }),
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

    const { brand, gears } = await this.getData();
    media.altText = this.images.gear(gears, useTimeStore(this.pinia).now, { brand: brand.brand });

    return media;
  }
}
