import TweetGenerator from "./TweetGenerator.mjs";
import Media from "../Media.mjs";
import { useSalmonRunSchedulesStore } from "../../../src/stores/schedules.mjs";

export default class SalmonRunTweet extends TweetGenerator
{
  key = 'salmonrun';
  name = 'Salmon Run';

  async getActiveSchedule() {
    await this.preparePinia();

    return useSalmonRunSchedulesStore().activeSchedule
  }

  async getDataTime() {
    let schedule = await this.getActiveSchedule();

    return Date.parse(schedule.startTime);
  }

  async _getStatus() {
    let schedule = await this.getActiveSchedule();

    let hasMysteryWeapon = schedule.settings.weapons.some(w => w.name === 'Random');

    if (hasMysteryWeapon) {
      return `Salmon Run is now open on ${schedule.settings.coopStage.name} with MYSTERY WEAPONS! #salmonrun #splatoon3`;
    }

    return `Salmon Run is now open on ${schedule.settings.coopStage.name}! #salmonrun #splatoon3`;
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture('salmonrun');

    return media;
  }
}
