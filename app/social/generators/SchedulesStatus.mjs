import Media from '../Media.mjs';
import { useAnarchyOpenSchedulesStore, useAnarchySeriesSchedulesStore, useRegularSchedulesStore, useSplatfestOpenSchedulesStore, useSplatfestProSchedulesStore, useXSchedulesStore } from '../../../src/stores/schedules.mjs';
import { useUSSplatfestsStore } from '../../../src/stores/splatfests.mjs';
import ScreenshotHelper from '../../screenshots/ScreenshotHelper.mjs';
import StatusGenerator from './StatusGenerator.mjs';
export default class SchedulesStatus extends StatusGenerator
{
  key = 'schedules';
  name = 'Schedules';

  async getStages() {
    await this.preparePinia();

    return {
      regular: useRegularSchedulesStore().activeSchedule,
      anarchySeries: useAnarchySeriesSchedulesStore().activeSchedule,
      anarchyOpen: useAnarchyOpenSchedulesStore().activeSchedule,
      xMatch: useXSchedulesStore().activeSchedule,
      splatfestOpen: useSplatfestOpenSchedulesStore().activeSchedule,
      splatfestPro: useSplatfestProSchedulesStore().activeSchedule,
      tricolor: useUSSplatfestsStore().tricolor,
    };
  }

  async getDataTime() {
    await this.preparePinia();

    let stages = await this.getStages();
    let schedule = stages.regular || stages.splatfestOpen;

    return Date.parse(schedule.startTime);
  }

  async _getStatus() {
    let stages = await this.getStages();

    if (stages.splatfestOpen?.settings) {
      let festOpenStages = stages.splatfestOpen.settings.vsStages;
      let festProStages = stages.splatfestPro.settings.vsStages;

      let lines = [
        'Join the Splatfest Battle! #splatfest #maprotation',
        '',
        `– Open: ${festOpenStages[0].name} and ${festOpenStages[1].name}`,
        `– Pro: ${festProStages[0].name} and ${festProStages[1].name}`,
      ];

      if(stages.tricolor?.isTricolorActive && stages.tricolor.tricolorStage) {
        lines.push(`– Tricolor: ${stages.tricolor.tricolorStage.name}`);
      }

      if(stages.tricolor?.isTricolorActive && stages.tricolor.tricolorStages) {
        lines.push(`– Tricolor: ${stages.tricolor.tricolorStages[0].name}`);
      }
      return lines.join('\n');

    }

    let lines = [
      'Splatoon 3 map rotation: #maprotation',
      '',
      `– Anarchy (Series): ${stages.anarchySeries.settings.vsRule.name}`,
      `– Anarchy (Open): ${stages.anarchyOpen.settings.vsRule.name}`,
      `– X Battle: ${stages.xMatch.settings.vsRule.name}`,
    ];

    return lines.join('\n');
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let stages = await this.getStages();

    // If the Tricolor stage is active, we need to make the image size a little taller
    // let viewport = stages.tricolor?.isTricolorActive
    //   ? { height: 925 }
    //   : { };
    let viewport = {}; // Disabling for now

    let media = new Media;
    media.file = await screenshotHelper.capture('schedules', { viewport });

    let detail = s => `${s.settings.vsRule.name} on ${s.settings.vsStages[0].name} and ${s.settings.vsStages[1].name}`;

    let lines = ['Splatoon 3 map rotation:\n'];

    if (stages.splatfestOpen?.settings) {
      lines.push(...[
        `Splatfest Battle (Open): ${detail(stages.splatfestOpen)}`,
        `Splatfest Battle (Pro): ${detail(stages.splatfestPro)}`,
      ]);
    } else {
      lines.push(...[
        `Regular Battle: ${detail(stages.regular)}`,
        `Anarchy Battle (Series): ${detail(stages.anarchySeries)}`,
        `Anarchy Battle (Open): ${detail(stages.anarchyOpen)}`,
        `X Battle: ${detail(stages.xMatch)}`,
      ]);
    }

    media.altText = lines.filter(l => l).join('\n');

    return media;
  }
}
