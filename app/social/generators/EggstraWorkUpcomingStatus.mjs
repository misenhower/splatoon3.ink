import Media from '../Media.mjs';
import { useEggstraWorkSchedulesStore } from '../../../src/stores/schedules.mjs';
import { useTimeStore } from '../../../src/stores/time.mjs';
import ScreenshotHelper from '../../screenshots/ScreenshotHelper.mjs';
import StatusGenerator from './StatusGenerator.mjs';

export default class EggstraWorkUpcomingStatus extends StatusGenerator
{
  key = 'eggstrawork.upcoming';
  name = 'Upcoming Eggstra Work';

  async getActiveSchedule() {
    await this.preparePinia();

    // Look for any upcoming schedules
    return useEggstraWorkSchedulesStore().upcomingSchedules[0];
  }

  async getDataTime() {
    let schedule = await this.getActiveSchedule();

    return schedule
      ? Date.parse(schedule.startTime)
      : false;
  }

  _getDescription(schedule) {
    let stageName = schedule.settings.coopStage.name || this.t('salmon.unknownStage');

    return this.t('eggstra.upcoming', { stage: stageName });
  }

  async _getStatus() {
    let schedule = await this.getActiveSchedule();

    if (!schedule) {
      return false;
    }

    let lines = [];

    lines.push(this._getDescription(schedule));
    lines.push('');

    let startTime = Date.parse(schedule.startTime);
    let now = useTimeStore().now;
    let time = this.messages.timeUntil(startTime, now);

    lines.push(this.t('salmon.starts', { time }));
    lines.push(...schedule.settings.weapons.map(w => this.t('salmon.weapon', { weapon: w.name })));

    return lines.join('\n');
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let schedule = await this.getActiveSchedule();

    let media = new Media;
    media.file = await screenshotHelper.capture('salmonRun', {
      params: { startTime: schedule?.startTime, eggstra: 'true' },
    });

    return media;
  }
}
