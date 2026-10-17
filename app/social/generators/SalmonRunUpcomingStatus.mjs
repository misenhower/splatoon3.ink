import Media from '../Media.mjs';
import { useSalmonRunSchedulesStore } from '../../../src/stores/schedules.mjs';
import { useTimeStore } from '../../../src/stores/time.mjs';
import ScreenshotHelper from '../../screenshots/ScreenshotHelper.mjs';
import StatusGenerator from './StatusGenerator.mjs';

export default class SalmonRunUpcomingStatus extends StatusGenerator
{
  key = 'salmonrun.upcoming';
  name = 'Upcoming Salmon Run';

  async getActiveSchedule() {
    await this.preparePinia();

    // Look for any interesting upcoming schedules
    return useSalmonRunSchedulesStore(this.pinia).upcomingSchedules.find(
      s => s.isBigRun
        || s.isMystery
        || s.isGrizzcoMystery,
    );
  }

  async getDataTime() {
    let schedule = await this.getActiveSchedule();

    return schedule
      ? Date.parse(schedule.startTime)
      : false;
  }

  _getDescription(schedule) {
    let stageName = this.game('stages', schedule.settings.coopStage) || this.t('salmon.unknownStage');

    switch (true) {
      case schedule.isBigRun:
        return this.t('salmon.upcomingBigRun', { stage: stageName });
      case schedule.isGrizzcoMystery:
        return this.t('salmon.upcomingGrizzco', { stage: stageName });
      case schedule.isMystery:
        return this.t('salmon.upcomingMystery', { stage: stageName });
    }
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
    let now = useTimeStore(this.pinia).now;
    let time = this.messages.timeUntil(startTime, now);

    lines.push(this.t('salmon.starts', { time }));
    lines.push(...schedule.settings.weapons.map(w => this.t('salmon.weapon', { weapon: this.game('weapons', w) })));

    return lines.join('\n');
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let schedule = await this.getActiveSchedule();

    let media = new Media;
    media.file = await screenshotHelper.capture('salmonrun', {
      params: { startTime: schedule?.startTime },
    });

    return media;
  }
}
