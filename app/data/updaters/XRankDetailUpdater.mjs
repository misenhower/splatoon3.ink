import { olderThan } from "../../common/fs.mjs";
import prefixedConsole from "../../common/prefixedConsole.mjs";
import { getXRankSeasonId } from "../../common/util.mjs";
import DataUpdater from "./DataUpdater.mjs";

export default class XRankDetailUpdater extends DataUpdater
{
  name = 'X-Rank Detail';
  filename = 'xrank/xrank.detail';

  imagePaths = [
    '$..image.url',
    '$..image2d.url',
    '$..image2dThumbnail.url',
    '$..image3d.url',
    '$..image3dThumbnail.url',
  ];

  constructor(seasonId, endTime, xRankDetailType) {
    super();

    this.seasonId = seasonId;
    this.endTime = endTime;
    this.xRankDetailType = xRankDetailType;

    let readableId = getXRankSeasonId(seasonId);
    this.filename += `.${readableId}.${xRankDetailType.key}`;
  }

  get console() {
    this._console ??= prefixedConsole('Updater', this.region, this.name, getXRankSeasonId(this.seasonId), this.xRankDetailType.name);

    return this._console;
  }

  shouldUpdate() {
    // We want to update this data until 4 hours after the season ends
    let cutoff = new Date(this.endTime);
    cutoff.setHours(cutoff.getHours() + 4);

    return olderThan(this.getPath(this.filename), cutoff);
  }

  async getData(locale) {
    let result;
    let edges = [];
    let dataKey = this.xRankDetailType.dataKey;

    // Get each page's data
    let pages = this.splatnet(locale).getXRankingDetailPages(this.xRankDetailType, this.seasonId);
    for await (let page of pages) {
      result = page;
      edges.push(...page.data.node[dataKey].edges);
    }

    // Replace the list of nodes with the complete list from all pages
    result.data.node[dataKey].edges = edges;

    return result;
  }
}
