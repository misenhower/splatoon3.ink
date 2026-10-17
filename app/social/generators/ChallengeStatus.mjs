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

    let schedule = useEventSchedulesStore(this.pinia).activeSchedule;

    if (schedule?.activeTimePeriod) {
      return schedule;
    }
  }

  async getDataTime() {
    let schedule = await this.getActiveSchedule();

    return Date.parse(schedule?.activeTimePeriod?.startTime);
  }

  async _getStatus() {
    let schedule = await this.getActiveSchedule();

    let name = br2nl(this.game('events', schedule.settings.leagueMatchEvent), ' ');
    let desc = br2nl(this.game('events', schedule.settings.leagueMatchEvent, 'desc'), ' ');

    return [
      this.t('challenge.open', { name, description: desc }),
      '',
      this.t('challenge.stages', {
        period: this.messages.period(schedule.activeTimePeriod?.startTime, schedule.activeTimePeriod?.endTime),
        rule: this.game('rules', schedule.settings.vsRule),
        stage1: this.game('stages', schedule.settings.vsStages[0]),
        stage2: this.game('stages', schedule.settings.vsStages[1]),
      }),
    ].join('\n');
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let schedule = await this.getActiveSchedule();

    let media = new Media;
    media.file = await screenshotHelper.capture('challenges');

    media.altText = this.game('events', schedule.settings.leagueMatchEvent, 'regulation')?.replace(/<br \/>/g, '\n');

    return media;
  }
}
