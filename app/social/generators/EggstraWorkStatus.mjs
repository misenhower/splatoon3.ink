import Media from '../Media.mjs';
import { useEggstraWorkSchedulesStore } from '../../../src/stores/schedules.mjs';
import ScreenshotHelper from '../../screenshots/ScreenshotHelper.mjs';
import StatusGenerator from './StatusGenerator.mjs';

export default class EggstraWorkStatus extends StatusGenerator
{
  key = 'eggstrawork';
  name = 'Eggstra Work';

  async getActiveSchedule() {
    await this.preparePinia();

    return useEggstraWorkSchedulesStore(this.pinia).activeSchedule;
  }

  async getDataTime() {
    let schedule = await this.getActiveSchedule();

    return Date.parse(schedule?.startTime);
  }

  async _getStatus() {
    let schedule = await this.getActiveSchedule();

    let lines = [];

    lines.push(this.t('eggstra.open', {
      stage: this.game('stages', schedule.settings.coopStage),
      period: this.messages.period(schedule.startTime, schedule.endTime),
    }));

    lines.push('');

    lines.push(this.t('salmon.weapons'));
    lines.push(...schedule.settings.weapons.map(w => this.t('salmon.weapon', { weapon: this.game('weapons', w) })));

    return lines.join('\n');
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture('salmonrun', {
      params: { eggstra: 'true' },
    });

    return media;
  }
}
