import { useTimeStore } from '../../../src/stores/time.mjs';
import Media from '../Media.mjs';
import { useGearStore } from '../../../src/stores/gear.mjs';
import { getGearIcon } from '../../common/util.mjs';
import StatusGenerator from './StatusGenerator.mjs';

export default class RegularGearStatus extends StatusGenerator
{
  key = 'gear.regular';
  name = 'Regular Gear';

  async getGears() {
    await this.preparePinia();

    return useGearStore(this.pinia).regularGear?.slice().reverse();
  }

  async getLatestGear() {
    return (await this.getGears())?.[0];
  }

  async getDataTime() {
    let gear = await this.getLatestGear();

    // We only have end times for gear, so use that to track the status time
    return Date.parse(gear.saleEndTime);
  }

  async _getStatus() {
    let gear = await this.getLatestGear();

    let icon = getGearIcon(gear);
    let name = this.game('gear', gear.gear);
    let power = this.game('powers', gear.gear.primaryGearPower);
    // let url = `https://splatoon3.ink/nso/g/${gear.id}`;

    return [
      this.t('gear.regular', { icon, name, power }),
      // '',
      // `🛒 Order: ${url}`,
    ].join('\n');
  }

  /** @param {screenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture('gear/regular');

    media.altText = this.images.gear(await this.getGears(), useTimeStore(this.pinia).now);

    return media;
  }
}
