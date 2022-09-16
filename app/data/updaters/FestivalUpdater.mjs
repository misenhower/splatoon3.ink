import fs from 'fs/promises';
import DataUpdater from "./DataUpdater.mjs";

export default class FestivalUpdater extends DataUpdater
{
  name = 'Festivals';
  filename = 'festivals';

  imagePaths = [
    '$..image.url',
  ];

  getData() {
    return this.splatnet.getFestRecordData();
  }

  async formatDataForWrite(data) {
    // Combine this region's data with the other regions' data.
    let result = null;
    try {
      result = await fs.readFile(this.getPath(this.filename));
    } catch (e) {
      //
    }

    result = result ? JSON.parse(result) : {};

    result[this.region] = data;

    return super.formatDataForWrite(result);
  }
}
