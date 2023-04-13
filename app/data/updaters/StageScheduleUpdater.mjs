import ValueCache from "../../common/ValueCache.mjs";
import DataUpdater from "./DataUpdater.mjs";
import _ from 'lodash';

export default class StageScheduleUpdater extends DataUpdater
{
  name = 'Schedules';
  filename = 'schedules';

  imagePaths = [
    '$..image.url',
    '$..originalImage.url',
    '$..thumbnailImage.url',
    '$..bannerImage.url',
  ];

  derivedIds = [
    '$..weapons.*',
  ];

  localizations = [
    {
      key: 'stages',
      nodes: [
        '$..vsStages.nodes.*',
        '$..coopStage',
      ],
      id: 'id',
      values: 'name',
    },
    {
      key: 'rules',
      nodes: '$..vsRule',
      id: 'id',
      values: 'name',
    },
    {
      key: 'weapons',
      nodes: '$..weapons.*',
      id: '__splatoon3ink_id',
      values: 'name',
    },
  ];

  async getData(locale) {
    let data = await this.splatnet(locale).getStageScheduleData();

    await this.processKingSalmonids(data);

    return data;
  }

  async processKingSalmonids(data) {
    let cache = new ValueCache('kingsalmonids');
    let guesses = (await cache.getData()) || [];

    // Get all known schedule times
    let schedules = _.sortBy([
      ..._.get(data, 'data.coopGroupingSchedule.regularSchedules.nodes'),
      ..._.get(data, 'data.coopGroupingSchedule.bigRunSchedules.nodes'),
    ], 'startTime');

    // Remove cached times that don't exist anymore
    guesses = guesses.filter(g => schedules.some(s => s.startTime === g.startTime));

    // Process each schedule
    let king = null;
    for (let schedule of schedules) {
      // Look for an existing guess
      let guess = guesses.find(g => g.startTime === schedule.startTime);

      // Determine the king for the current rotation
      king = guess ? guess.king : this.nextKingSalmonid(king);

      // If we didn't have it cached, add this guess to the cache
      if (!guess) {
        guesses.push({ startTime: schedule.startTime, king });
      }

      schedule.__splatoon3ink_king_salmonid_guess = king;
    }

    await cache.setData(_.sortBy(guesses, 'startTime'));
  }

  nextKingSalmonid(last = null) {
    const sequence = ['Cohozuna', 'Horrorboros'];

    let index = sequence.indexOf(last) + 1;

    return sequence[index % sequence.length];
  }
}
