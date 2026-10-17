import Media from '../Media.mjs';
import { useUSSplatfestsStore, useEUSplatfestsStore, useJPSplatfestsStore, useAPSplatfestsStore, STATUS_ACTIVE, STATUS_PAST } from '../../../src/stores/splatfests.mjs';
import { useTimeStore } from '../../../src/stores/time.mjs';
import ScreenshotHelper from '../../screenshots/ScreenshotHelper.mjs';
import StatusGenerator from './StatusGenerator.mjs';

export default class SplatfestStatus extends StatusGenerator
{
  key = 'splatfest';
  name = 'Splatfest';

  constructor(region, options = {}) {
    super(options);
    this.region = region;
    this.key += `.${region}`;
    this.name += ` (${region})`;
  }

  async getFestival() {
    await this.preparePinia();
    let store;
    switch(this.region) {
      case 'NA': store = useUSSplatfestsStore(); break;
      case 'EU': store = useEUSplatfestsStore(); break;
      case 'JP': store = useJPSplatfestsStore(); break;
      case 'AP': store = useAPSplatfestsStore(); break;
    }
    return store.upcomingFestival
      || store.activeFestival
      || store.recentFestival;
  }

  async getState() {
    let festival = await this.getFestival();

    let startTime = Date.parse(festival?.startTime);
    let now = useTimeStore().now;
    let hoursAway = (startTime - now) / (1000 * 60 * 60);

    switch (true) {
      case !festival:
        return null;
      case festival.status === STATUS_PAST:
        return 'ended';
      case festival.status === STATUS_ACTIVE:
        return 'active';
      case hoursAway <= 24:
        return 'upcoming:1d';
      case hoursAway <= 72:
        return 'upcoming:3d';
      default:
        return 'upcoming';
    }
  }

  async getDataTime() {
    let festival = await this.getFestival();
    let state = await this.getState();

    if (!festival || !state) {
      return null;
    }

    return `${festival.id}:${state}`;
  }

  async shouldPost(client) {
    let festival = await this.getFestival();

    if (festival?.regions[0] !== this.region) {
      return false;
    }

    let currentId = await this.getDataTime();

    let cachedId = await this.lastPostCache(client).getData();

    return currentId && currentId !== cachedId;
  }

  async _getStatus() {
    let festival = await this.getFestival();
    let state = await this.getState();

    if (!festival || !state) {
      return false;
    }

    const global = festival.regions.length == 4;
    const regionText = global ? this.t('festival.global') : festival.regions.join('/');

    switch (state) {
      case 'upcoming':
        return this.t('festival.upcoming', { region: regionText, title: festival.title });
      case 'upcoming:3d':
        return this.t('festival.upcoming:3d', { region: regionText, title: festival.title });
      case 'upcoming:1d':
        return this.t('festival.upcoming:1d', { region: regionText, title: festival.title });
      case 'active':
        return this.t('festival.active', { region: regionText, title: festival.title });
      case 'ended':
        return this.t('festival.ended', { region: regionText });
    }
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture(`splatfest/${this.region}`);

    return media;
  }
}
