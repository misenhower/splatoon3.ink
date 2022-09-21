import TweetGenerator from "./TweetGenerator.mjs";
import Media from "../Media.mjs";
import { useAnarchyOpenSchedulesStore, useAnarchySeriesSchedulesStore, useRegularSchedulesStore } from "../../../src/stores/schedules.mjs";

export default class SchedulesTweet extends TweetGenerator
{
  key = 'schedules';
  name = 'Schedules';

  async getStages() {
    await this.preparePinia();

    return {
      regular: useRegularSchedulesStore().activeSchedule,
      anarchySeries: useAnarchySeriesSchedulesStore().activeSchedule,
      anarchyOpen: useAnarchyOpenSchedulesStore().activeSchedule,
    }
  }

  async getDataTime() {
    await this.preparePinia();

    let schedule = (await this.getStages()).regular;

    return Date.parse(schedule.startTime);
  }

  async _getStatus() {
    let stages = await this.getStages();

    return `Splatoon 3 map rotation: Anarchy (Series) game mode: ${stages.anarchySeries.settings.vsRule.name}, Anarchy (Open) game mode: ${stages.anarchyOpen.settings.vsRule.name} #maprotation`;
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture('schedules');

    let stages = await this.getStages();
    let detail = s => `${s.settings.vsRule.name} on ${s.settings.vsStages[0].name} and ${s.settings.vsStages[1].name}`;

    media.altText = [
      'Splatoon 3 map rotation:',
      '',
      `Regular Battle: ${detail(stages.regular)}`,
      `Anarchy Battle (Series): ${detail(stages.anarchySeries)}`,
      `Anarchy Battle (Open): ${detail(stages.anarchyOpen)}`,
    ].join('\n');

    return media;
  }
}
