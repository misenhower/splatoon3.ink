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

    let lines = [];

    let hasMysteryWeapon = schedule.settings.weapons.some(w => w.name === 'Random');

    if (hasMysteryWeapon) {
      lines.push(`Salmon Run is now open on ${schedule.settings.coopStage.name} with MYSTERY WEAPONS! #salmonrun #splatoon3`);
    } else {
      lines.push(`Salmon Run is now open on ${schedule.settings.coopStage.name}! #salmonrun #splatoon3`);
    }

    lines.push('');

    lines.push('Current weapons:');
    lines.push(...schedule.settings.weapons.map(w => `– ${w.name}`));

    return lines.join('\n');
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture('salmonrun');

    return media;
  }
}
