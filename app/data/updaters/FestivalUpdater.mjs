import fs from 'fs/promises';
import jsonpath from 'jsonpath';
import DataUpdater from "./DataUpdater.mjs";
import FestivalRankingUpdater from './FestivalRankingUpdater.mjs';
import { getFestId } from '../../common/util.mjs';
import ValueCache from '../../common/ValueCache.mjs';

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

    this.deriveFestivalIds(result);

    // Get the detailed data for each Splatfest
    for (let node of result.data.festRecords.nodes) {
      let detailResult = await this.getFestivalDetails(node);

      Object.assign(node, detailResult.data.fest);

      if (node.teams.find(t => t.result)) {
        let rankingUpdater = new FestivalRankingUpdater(this.region, node.id, node.endTime);
        await rankingUpdater.updateIfNeeded();
      }
    }

    return result;
  }

  deriveFestivalIds(data) {
    jsonpath.apply(data, '$..nodes.*', node => ({
      '__splatoon3ink_id': getFestId(node.id),
      ...node,
    }));
  }

  async getFestivalDetails(node) {
    let cache = new ValueCache(`festivals.${node.id}`);

    // We don't need to use the locale for this data
    // since localization data retrieval happens elsewhere.
    let data = await cache.getData();

    // How long until this festival ends/ended?
    // We want to retrieve the latest data until 4 hours after the Splatfest ends
    let diff = Date.now() - new Date(node.endTime);
    let forceUpdate = (diff < 4 * 60 * 60 * 100);

    if (forceUpdate || !data) {
      this.console.info(`Getting festival details for ${node.id}`);
      data = await this.splatnet().getFestDetailData(node.id);
      await cache.setData(data);
    }

    return data;
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
