import StatusGenerator from "./StatusGenerator.mjs";
import Media from "../Media.mjs";
import { useSalmonRunSchedulesStore } from "../../../src/stores/schedules.mjs";

export default class SalmonRunStatus extends StatusGenerator
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

  _isGrizzcoMystery(schedule) {
    return schedule.settings.weapons.some(w => w.__splatoon3ink_id === 'edcfecb7e8acd1a7')
  }

  _isMystery(schedule) {
    return schedule.settings.weapons.some(w => w.name === 'Random');
  }

  async _getStatus() {
    let schedule = await this.getActiveSchedule();

    let lines = [];

    let mode = schedule.isBigRun ? 'BIG RUN' : 'Salmon Run';

    if (this._isGrizzcoMystery(schedule)) {
      lines.push(`${mode} is now open on ${schedule.settings.coopStage.name} with GRIZZCO MYSTERY WEAPONS! #salmonrun #splatoon3`);
    } else if (this._isMystery(schedule)) {
      lines.push(`${mode} is now open on ${schedule.settings.coopStage.name} with MYSTERY WEAPONS! #salmonrun #splatoon3`);
    } else {
      lines.push(`${mode} is now open on ${schedule.settings.coopStage.name}! #salmonrun #splatoon3`);
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
