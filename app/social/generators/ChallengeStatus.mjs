import StatusGenerator from "./StatusGenerator.mjs";
import Media from "../Media.mjs";
import { useEventSchedulesStore } from "../../../src/stores/schedules.mjs";
export default class ChallengeStatus extends StatusGenerator
{
  key = 'challenge';
  name = 'Challenge';

  async getActiveSchedule() {
    await this.preparePinia();

    let schedule = useEventSchedulesStore().activeSchedule;

    if (schedule.activeTimePeriod) {
      return schedule;
    }
  }

  async getDataTime() {
    let schedule = await this.getActiveSchedule();

    return Date.parse(schedule?.activeTimePeriod?.start_time);
  }

  async _getStatus() {
    let schedule = await this.getActiveSchedule();

    return [
      `A challenge event is now open! ${schedule.settings.leagueMatchEvent.name} – ${schedule.settings.leagueMatchEvent.desc}`,
      '',
      `Play ${schedule.settings.vsRule.name} on ${schedule.settings.vsStages[0].name} and ${schedule.settings.vsStages[1].name}! #splatoon3`
    ].join('\n');
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture('challenges');

    return media;
  }
}
