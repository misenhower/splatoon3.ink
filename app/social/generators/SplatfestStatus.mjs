import StatusGenerator from "./StatusGenerator.mjs";
import Media from "../Media.mjs";
import { useUSSplatfestsStore, STATUS_ACTIVE, STATUS_PAST } from '../../../src/stores/splatfests.mjs';
import { useTimeStore } from "../../../src/stores/time.mjs";

export default class SplatfestStatus extends StatusGenerator
{
  key = 'splatfest';
  name = 'Splatfest';

  async getFestival() {
    await this.preparePinia();
    let store = useUSSplatfestsStore();

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

    switch (state) {
      case 'upcoming':
        return `You can now vote in the next global Splatfest: ${festival.title} #splatfest #splatoon3`;
      case 'upcoming:3d':
        return `Reminder: The next global Splatfest starts in 3 DAYS! ${festival.title} #splatfest #splatoon3`
      case 'upcoming:1d':
        return `Reminder: The next global Splatfest starts in 24 HOURS! ${festival.title} #splatfest #splatoon3`
      case 'active':
        return `The global Splatfest is NOW OPEN! ${festival.title} #splatfest #splatoon3`
      case 'ended':
        return `The global Splatfest is now closed. Results are usually posted within 2 hours! #splatfest #splatoon3`
    }
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture('splatfest');

    return media;
  }
}
