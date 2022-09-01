import TweetGenerator from "./TweetGenerator.mjs";
import { captureScreenshot } from "../../screenshots/captureScreenshot.mjs";
import Media from "../Media.mjs";

const releaseDate = new Date('2022-09-09');

export default class CountdownTweet extends TweetGenerator
{
  shouldTweet() {
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

  async _getMedia() {
    let media = new Media;
    media.file = await captureScreenshot('countdown');

    return media;
  }
}
