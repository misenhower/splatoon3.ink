import fs from 'fs/promises';
import DataUpdater from "./DataUpdater.mjs";
import FestivalRankingUpdater from './FestivalRankingUpdater.mjs';

function getFestId(id) {
  return Buffer.from(id, 'base64').toString().match(/^Fest-[A-Z]+:(.+)$/)?.[1] ?? id;
}

function generateFestUrl(id) {
  return process.env.DEBUG ?
    `https://s.nintendo.com/av5ja-lp1/znca/game/4834290508791808?p=/fest_record/${id}` :
    `${process.env.SITE_URL ?? ''}/nso/f/${id}`;
}

export default class FestivalUpdater extends DataUpdater
{
  name = 'Festivals';
  filename = 'festivals';
  calendarName = 'Splatoon 3 Splatfests';
  calendarFilename = 'festivals';

  constructor(region = null) {
    super(region);

    this.calendarName += ` (${region})`;
    this.calendarFilename += `.${region}`;
  }

  imagePaths = [
    '$..image.url',
  ];

  async getData(locale) {
    let result = await this.splatnet(locale).getFestRecordData();

    // Get the detailed data for each Splatfest
    // TODO: Implement caching for past Splatfests to reduce the number of requests needed.
    for (let node of result.data.festRecords.nodes) {
      let detailResult = await this.splatnet(locale).getFestDetailData(node.id);

      Object.assign(node, detailResult.data.fest);

      let rankingUpdater = new FestivalRankingUpdater(this.region, node.id, node.endTime);
      await rankingUpdater.updateIfNeeded();
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

  *getCalendarEntries(data) {
    for (const fest of data.data.festRecords.nodes) {
      yield {
        id: getFestId(fest.id),
        title: `Splatfest (${this.region}): ${fest.teams.map(t => t.teamName).join(' vs. ')}`,
        url: generateFestUrl(fest.id),
        imageUrl: fest.image.url,
        start: fest.startTime,
        end: fest.endTime,
      };
    }
  }
}
