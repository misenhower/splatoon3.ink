import fs from 'fs/promises';
import jsonpath from 'jsonpath';
import { getFestId } from '../../common/util.mjs';
import ValueCache from '../../common/ValueCache.mjs';
import { regionTokens } from '../../splatnet/NsoClient.mjs';
import FestivalRankingUpdater from './FestivalRankingUpdater.mjs';
import DataUpdater from './DataUpdater.mjs';

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

  localizations = [
    {
      key: 'festivals',
      nodes: [
        '$..festRecords.nodes.*',
      ],
      id: '__splatoon3ink_id',
      values: [
        'title',
        'teams.0.teamName',
        'teams.1.teamName',
        'teams.2.teamName',
      ],
    },
  ];

  shouldUpdate() {
    const tokens = regionTokens();

    if (!tokens[this.region]) {
      this.console.log(`No token provided for ${this.region} region, skipping...`);

      return false;
    }

    return super.shouldUpdate();
  }

  async getData(locale) {
    let cursor = null;
    let hasNextPage = true;
    let result = { data: { festRecords: { nodes: [] } } };

    while (hasNextPage) {
      let data = await this.splatnet(locale).getFestRecordDataPage(cursor);

      // Grab the nodes from the current page
      result.data.festRecords.nodes.push(...jsonpath.query(data, '$..festRecords.edges.*.node'));

      // Update the cursor and next page indicator
      cursor = data.data.festRecords.pageInfo.endCursor;
      hasNextPage = data.data.festRecords.pageInfo.hasNextPage;
    }

    this.deriveFestivalIds(result);

    // Get the detailed data for each Splatfest
    // (unless we're getting localization-specific data)
    if (locale === this.defaultLocale) {
      await Promise.all(result.data.festRecords.nodes.map(async node => {
        let detailResult = await this.getFestivalDetails(node);

        Object.assign(node, detailResult.data.fest);

        if (!this.settings.disableFestivalRankings && node.teams.find(t => t.result)) {
          let rankingUpdater = new FestivalRankingUpdater(this.region, node.id, node.endTime);

          try {
            await rankingUpdater.updateIfNeeded();
          } catch (e) {
            this.console.error(e);
          }
        }
      }));
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
    let cachedAt = await cache.getCachedAt();

    // How long until this festival ends/ended?
    // We want to retrieve the latest data until 4 hours after the Splatfest ends
    let cutoff = new Date(node.endTime);
    cutoff.setHours(cutoff.getHours() + 4);

    if (!data || cachedAt < cutoff) {
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
