import fs from 'fs/promises';
import prefixedConsole from "../../common/prefixedConsole.mjs";
import DataUpdater from "./DataUpdater.mjs";

export default class FestivalRankingUpdater extends DataUpdater
{
  name = 'FestivalRankingUpdater';
  filename = 'festivals.ranking';

  constructor(region = null, festID = null, endTime = null) {
    super(region);

    this.festID = festID;
    this.endTime = endTime;
    this.filename += `.${region}.${festID}`;
  }

  imagePaths = [
    '$..image.url',
    '$..originalImage.url',
    '$..image2d.url',
    '$..image2dThumbnail.url',
    '$..image3d.url',
    '$..image3dThumbnail.url',
  ];

  get console() {
    this._console ??= prefixedConsole('Updater', this.region, this.name, this.festID);

    return this._console;
  }

  async shouldUpdate() {
    // Does the file exist?
    try {
      await fs.readFile(this.getPath(this.filename));
    } catch (e) {
      // File doesn't exist or other error, so we need to download the data
      return true;
    }

    // How long until this festival ends/ended?
    // We want to update this data until 4 hours after the Splatfest ends
    let diff = Date.now() - new Date(this.endTime);
    if (diff < 4 * 60 * 60 * 100) {
      return true;
    }

    // Otherwise, no need to update
    return false;
  }

  getData(locale) {
    return this.splatnet(locale).getFestRankingData(this.festID);
  }
}
