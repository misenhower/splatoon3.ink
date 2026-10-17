import Media from '../Media.mjs';
import { useSalmonRunSchedulesStore } from '../../../src/stores/schedules.mjs';
import ScreenshotHelper from '../../screenshots/ScreenshotHelper.mjs';
import StatusGenerator from './StatusGenerator.mjs';

export default class SalmonRunStatus extends StatusGenerator
{
  key = 'salmonrun';
  name = 'Salmon Run';

  async getActiveSchedule() {
    await this.preparePinia();

    return useSalmonRunSchedulesStore().activeSchedule;
  }

  async getDataTime() {
    let schedule = await this.getActiveSchedule();

    return Date.parse(schedule.startTime);
  }

  async _getStatus() {
    let schedule = await this.getActiveSchedule();

    let lines = [];

    let mode = this.t(schedule.isBigRun ? 'salmon.mode.bigRun' : 'salmon.mode.regular');
    let params = { mode, stage: schedule.settings.coopStage.name };

    if (schedule.isGrizzcoMystery) {
      lines.push(this.t('salmon.openGrizzco', params));
    } else if (schedule.isMystery) {
      lines.push(this.t('salmon.openMystery', params));
    } else {
      lines.push(this.t('salmon.open', params));
    }

    lines.push('');

    let king = schedule.settings.boss?.name;
    if (king) {
      lines.push(this.t('salmon.king', { king }));
      lines.push('');
    }

    lines.push(this.t('salmon.weapons'));
    lines.push(...schedule.settings.weapons.map(w => this.t('salmon.weapon', { weapon: w.name })));

    return lines.join('\n');
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture('salmonrun');

    return media;
  }
}
