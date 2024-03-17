import Media from "../Media.mjs";
import ScreenshotHelper from "../../screenshots/ScreenshotHelper.mjs";
import StatusGenerator from "./StatusGenerator.mjs";

const releaseDate = new Date('2022-09-09');

export default class CountdownStatus extends StatusGenerator
{
  shouldPost() {
    const now = new Date;
    const cutoff = new Date('2022-09-10');

    return now < cutoff;
  }

  _getStatus() {
    const now = new Date;
    const ms = releaseDate - now;
    let days = Math.max(0, Math.ceil(ms / 1000 / 60 / 60 / 24));

    switch (days) {
      case 0: return 'Splatoon 3 is NOW RELEASED! https://splatoon3.ink #Splatoon3';
      case 1: return 'Splatoon 3 releases in 1 DAY! https://splatoon3.ink #Splatoon3';
      default: return `Splatoon 3 releases in ${days} days! https://splatoon3.ink #Splatoon3`;
    }
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    let media = new Media;
    media.file = await screenshotHelper.capture('countdown');

    return media;
  }
}
