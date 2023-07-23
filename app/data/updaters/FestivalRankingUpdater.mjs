import prefixedConsole from "../../common/prefixedConsole.mjs";
import DataUpdater from "./DataUpdater.mjs";
import { getFestId, getFestTeamId } from '../../common/util.mjs';
import { olderThan } from '../../common/fs.mjs';

export default class FestivalRankingUpdater extends DataUpdater
{
  name = 'FestivalRankingUpdater';
  filename = 'festivals.ranking';

  constructor(region = null, festID = null, endTime = null) {
    super(region);

    this.festID = festID;
    this.endTime = endTime;
    this.filename += `.${region}.${getFestId(festID)}`;
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
    this._console ??= prefixedConsole('Updater', this.region, this.name, getFestId(this.festID));

    return this._console;
  }

  shouldUpdate() {
    // How long until this festival ends/ended?
    // We want to update this data until 4 hours after the Splatfest ends
    let cutoff = new Date(this.endTime);
    cutoff.setHours(cutoff.getHours() + 4);

    return olderThan(this.getPath(this.filename), cutoff);
  }

  async getData(locale) {
    const data = await this.splatnet(locale).getFestRankingData(this.festID);

    for (const team of data.data.fest.teams) {
      let pageInfo = team.result?.rankingHolders?.pageInfo;

      while (pageInfo?.hasNextPage) {
        this.console.log('Fetching next page for team %s (%s), cursor %s',
          getFestTeamId(team.id), team.teamName, pageInfo.endCursor);

        const page = await this.splatnet(locale).getFestRankingPage(team.id, pageInfo.endCursor);

        team.result.rankingHolders = {
          edges: [
            ...team.result.rankingHolders.edges,
            ...page.data.node.result.rankingHolders.edges,
          ],
          pageInfo: page.data.node.result.rankingHolders.pageInfo,
        };

        pageInfo = page.data.node.result.rankingHolders.pageInfo;
      }
    }

    return data;
  }
}
