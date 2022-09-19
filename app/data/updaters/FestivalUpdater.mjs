import fs from 'fs/promises';
import DataUpdater from "./DataUpdater.mjs";

export default class FestivalUpdater extends DataUpdater
{
  name = 'Festivals';
  filename = 'festivals';

  imagePaths = [
    '$..image.url',
  ];

  async getData() {
    let result = await this.splatnet.getFestRecordData();

    // Get the detailed data for each Splatfest
    // TODO: Implement caching for past Splatfests to reduce the number of requests needed.
    for (let node of result.data.festRecords.nodes) {
      let detailResult = await this.splatnet.getFestDetailData(node.id);

      Object.assign(node, detailResult.data.fest);
    }

    return result;
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
