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
      regular: useRegularSchedulesStore(this.pinia).activeSchedule,
      anarchySeries: useAnarchySeriesSchedulesStore(this.pinia).activeSchedule,
      anarchyOpen: useAnarchyOpenSchedulesStore(this.pinia).activeSchedule,
      xMatch: useXSchedulesStore(this.pinia).activeSchedule,
      splatfestOpen: useSplatfestOpenSchedulesStore(this.pinia).activeSchedule,
      splatfestPro: useSplatfestProSchedulesStore(this.pinia).activeSchedule,
      tricolor: useUSSplatfestsStore(this.pinia).tricolor,
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
        this.t('schedule.festival'),
        '',
        this.t('schedule.festivalOpen', {
          stage1: this.game('stages', festOpenStages[0]),
          stage2: this.game('stages', festOpenStages[1]),
        }),
        this.t('schedule.festivalPro', {
          stage1: this.game('stages', festProStages[0]),
          stage2: this.game('stages', festProStages[1]),
        }),
      ];

      if(stages.tricolor?.isTricolorActive && stages.tricolor.tricolorStage) {
        lines.push(this.t('schedule.tricolorOne', { stage: this.game('stages', stages.tricolor.tricolorStage) }));
      }

      if(stages.tricolor?.isTricolorActive && stages.tricolor.tricolorStages) {
        if(stages.tricolor.tricolorStages.length == 1) {
          lines.push(this.t('schedule.tricolorOne', { stage: this.game('stages', stages.tricolor.tricolorStages[0]) }));
        } else {
          lines.push(this.t('schedule.tricolorTwo', {
            stage1: this.game('stages', stages.tricolor.tricolorStages[0]),
            stage2: this.game('stages', stages.tricolor.tricolorStages[1]),
          }));
        }
      }
      return lines.join('\n');

    }

    let lines = [
      this.t('schedule.rotation'),
      '',
      this.t('schedule.series', { rule: this.game('rules', stages.anarchySeries.settings.vsRule) }),
      this.t('schedule.open', { rule: this.game('rules', stages.anarchyOpen.settings.vsRule) }),
      this.t('schedule.x', { rule: this.game('rules', stages.xMatch.settings.vsRule) }),
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

    let detail = s => ({
      rule: this.game('rules', s.settings.vsRule),
      stage1: this.game('stages', s.settings.vsStages[0]),
      stage2: this.game('stages', s.settings.vsStages[1]),
    });

    let lines = [this.t('schedule.alt.heading')];

    if (stages.splatfestOpen?.settings) {
      lines.push(...[
        this.t('schedule.alt.festivalOpen', detail(stages.splatfestOpen)),
        this.t('schedule.alt.festivalPro', detail(stages.splatfestPro)),
      ]);
    } else {
      lines.push(...[
        this.t('schedule.alt.regular', detail(stages.regular)),
        this.t('schedule.alt.series', detail(stages.anarchySeries)),
        this.t('schedule.alt.open', detail(stages.anarchyOpen)),
        this.t('schedule.alt.x', detail(stages.xMatch)),
      ]);
    }

    media.altText = lines.filter(l => l).join('\n');

    return media;
  }
}
