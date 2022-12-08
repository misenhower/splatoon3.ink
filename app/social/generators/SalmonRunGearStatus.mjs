import StatusGenerator from "./StatusGenerator.mjs";
import Media from "../Media.mjs";
import { useCoopGearStore } from "../../../src/stores/gear.mjs";

export default class SalmonRunGearStatus extends StatusGenerator
{
  key = 'gear.salmonrun';
  name = 'Salmon Run Gear';

  async getGear() {
    await this.preparePinia();

    return useCoopGearStore().monthlyGear;
  }

  async getDataTime() {
    let gear = await this.getGear();

    return gear?.__splatoon3ink_id;
  }

  async shouldPost() {
    let gear = await this.getGear();

    let cachedId = await this.lastPostCache.getData();

    return gear?.__splatoon3ink_id && gear?.__splatoon3ink_id !== cachedId;
  }

  async _getStatus() {
    let gear = await this.getGear();

    return `New Salmon Run reward gear is now available! This month's gear is the ${gear.name}. #salmonrun #splatoon3`;
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture('gear/salmonrun');

    return media;
  }
}
