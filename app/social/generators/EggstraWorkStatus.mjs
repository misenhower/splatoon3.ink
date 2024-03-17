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

    return useEggstraWorkSchedulesStore().activeSchedule;
  }

  async getDataTime() {
    let schedule = await this.getActiveSchedule();

    return Date.parse(schedule.startTime);
  }

  async _getStatus() {
    let schedule = await this.getActiveSchedule();

    let lines = [];

    let mode = 'EGGSTRA WORK';

    lines.push(`${mode} is now open on ${schedule.settings.coopStage.name}! #salmonrun #splatoon3`);

    lines.push('');

    lines.push('Current weapons:');
    lines.push(...schedule.settings.weapons.map(w => `– ${w.name}`));

    return lines.join('\n');
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture('salmonrun', {
      params: {eggstra: 'true'},
    });

    return media;
  }
}
