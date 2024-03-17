import Media from '../Media.mjs';
import { useEventSchedulesStore } from '../../../src/stores/schedules.mjs';
import { br2nl } from '../../../src/common/util.mjs';
import ScreenshotHelper from '../../screenshots/ScreenshotHelper.mjs';
import StatusGenerator from './StatusGenerator.mjs';
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

    return Date.parse(schedule?.activeTimePeriod?.startTime);
  }

  async _getStatus() {
    let schedule = await this.getActiveSchedule();

    let name = br2nl(schedule.settings.leagueMatchEvent.name, ' ');
    let desc = br2nl(schedule.settings.leagueMatchEvent.desc, ' ');

    return [
      `A challenge event is now open! ${name} – ${desc}`,
      '',
      `Play ${schedule.settings.vsRule.name} on ${schedule.settings.vsStages[0].name} and ${schedule.settings.vsStages[1].name}! #splatoon3`,
    ].join('\n');
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let schedule = await this.getActiveSchedule();

    let media = new Media;
    media.file = await screenshotHelper.capture('challenges');

    media.altText = schedule.settings.leagueMatchEvent.regulation?.replace(/<br \/>/g, '\n');

    return media;
  }
}
