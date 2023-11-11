import StatusGenerator from "./StatusGenerator.mjs";
import Media from "../Media.mjs";
import { useUSSplatfestsStore, useEUSplatfestsStore, useJPSplatfestsStore, useAPSplatfestsStore, STATUS_ACTIVE, STATUS_PAST } from '../../../src/stores/splatfests.mjs';
import { useTimeStore } from "../../../src/stores/time.mjs";
import ValueCache from '../../common/ValueCache.mjs';

export default class SplatfestStatus extends StatusGenerator
{
  key = 'splatfest';
  name = 'Splatfest';

  SplatfestStatus(region) {
    this.region = region;
  }

  lastPostCache(client) {
    // let US be no suffix for backwards compatibility
    const regionSuffix = this.region === 'NA' ? '' : `.${this.region}`;
    return new ValueCache(`social.${client.key}.${this.key}${regionSuffix}`);
  }


  async getFestival() {
    await this.preparePinia();
    let store;
    switch(this.region) {
      case "NA": store = useUSSplatfestsStore(); break;
      case "EU": store = useEUSplatfestsStore(); break;
      case "JP": store = useJPSplatfestsStore(); break;
      case "AP": store = useAPSplatfestsStore(); break;
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
    let regions = festival.__splatoon3ink_id.split("-")[0];
    switch(this.region) {
      // PRIORITY - US, EU, JP, AP
      case "NA": break;
      case "EU": if(regions.includes("U")) return false; break;
      case "JP": if(regions.includes("U") || regions.includes("E")) return false; break;
      case "AP": if(regions.includes("U") || regions.includes("E") || regions.includes("J")) return false; break;
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

    const availableRegions = [];
    const regions = festival.__splatoon3ink_id.split("-")[0];
    if (regions.includes("J")) availableRegions.push("JP");
    if (regions.includes("U")) availableRegions.push("NA");
    if (regions.includes("E")) availableRegions.push("EU");
    if (regions.includes("A")) availableRegions.push("AP");

    const global = availableRegions.length == 4;
    const regionText = !global ? ` (${availableRegions.join("/")})` : '';

    switch (state) {
      case 'upcoming':
        return `You can now vote in the next ${global ? 'global ' : ''}Splatfest: ${festival.title}${regionText} #splatfest #splatoon3`;
      case 'upcoming:3d':
        return `Reminder: The next ${global ? 'global ' : ''}Splatfest starts in 3 DAYS! ${festival.title}${regionText} #splatfest #splatoon3`
      case 'upcoming:1d':
        return `Reminder: The next ${global ? 'global ' : ''}Splatfest starts in 24 HOURS! ${festival.title}${regionText} #splatfest #splatoon3`
      case 'active':
        return `The ${global ? 'global ' : ''}Splatfest is NOW OPEN! ${festival.title}${regionText} #splatfest #splatoon3`
      case 'ended':
        return `The ${global ? 'global ' : ''}Splatfest is now closed${regionText}. Results are usually posted within 2 hours! #splatfest #splatoon3`
    }
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture(`splatfest/${this.region}`);

    return media;
  }
}
