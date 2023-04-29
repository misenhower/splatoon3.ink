import jsonpath from 'jsonpath';
import prefixedConsole from "../../common/prefixedConsole.mjs";
import { getXRankSeasonId } from '../../common/util.mjs';
import DataUpdater from "./DataUpdater.mjs";
import XRankDetailUpdater from "./XRankDetailUpdater.mjs";

export default class XRankUpdater extends DataUpdater
{
  name = 'X-Rank';
  filename = 'xrank/xrank';

  imagePaths = [
    '$..image.url',
    '$..image2d.url',
    '$..image2dThumbnail.url',
    '$..image3d.url',
    '$..image3dThumbnail.url',
  ];

  constructor(divisionName, divisionKey) {
    super();

    this.divisionName = divisionName;
    this.divisionKey = divisionKey;
    this.filename += `.${divisionName.toLowerCase()}`;
  }

  get console() {
    this._console ??= prefixedConsole('Updater', this.region, this.name, this.divisionName);

    return this._console;
  }

  async getData(locale) {
    let result = await this.splatnet(locale).getXRankingData(this.divisionKey);
    let seasons = this.getSeasons(result.data);

    for (let season of seasons) {
      this.deriveSeasonId(season);
      await this.updateSeasonDetail(season);
    }

    return result;
  }

  getSeasons(data) {
    return [
      data.xRanking.currentSeason,
      ...data.xRanking.pastSeasons.nodes,
    ];
  }

  deriveSeasonId(season) {
    season.__splatoon3ink_id = getXRankSeasonId(season.id);
  }

  async updateSeasonDetail(season) {
    for (let type of this.splatnet().getXRankingDetailQueryTypes()) {
      let updater = new XRankDetailUpdater(season.id, season.endTime, type);
      await updater.updateIfNeeded();
    }
  }
}
