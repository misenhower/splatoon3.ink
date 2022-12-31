import fs from 'fs/promises';
import prefixedConsole from "../../common/prefixedConsole.mjs";
import DataUpdater from "./DataUpdater.mjs";

function getFestId(id) {
  return Buffer.from(id, 'base64').toString().match(/^Fest-[A-Z]+:(.+)$/)?.[1] ?? id;
}

function getFestTeamId(id) {
  return Buffer.from(id, 'base64').toString().match(/^FestTeam-[A-Z]+:((.+):(.+))$/)?.[1] ?? id;
}

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
    this._console ??= prefixedConsole('Updater', this.region, this.name, getFestId(this.festID));

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

  async getData(locale) {
    const data = await this.splatnet(locale).getFestRankingData(this.festID);

    for (const team of data.data.fest.teams) {
      let pageInfo = team.result?.rankingHolders.pageInfo;

      while (pageInfo.hasNextPage) {
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
