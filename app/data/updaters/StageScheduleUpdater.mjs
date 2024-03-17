import _ from 'lodash';
import DataUpdater from "./DataUpdater.mjs";

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
    {
      key: 'bosses',
      nodes: '$..boss',
      id: 'id',
      values: 'name',
    },
    {
      key: 'events',
      nodes: '$..eventSchedules.nodes.*.leagueMatchSetting.leagueMatchEvent',
      id: 'id',
      values: [
        'name',
        'desc',
        'regulation',
      ],
    },
  ];

  async getData(locale) {
    let data = await this.splatnet(locale).getStageScheduleData();

    await this.processKingSalmonids(data);

    return data;
  }

  async processKingSalmonids(data) {
    // Get all known schedule times
    let schedules = _.sortBy([
      ..._.get(data, 'data.coopGroupingSchedule.regularSchedules.nodes'),
      ..._.get(data, 'data.coopGroupingSchedule.bigRunSchedules.nodes'),
    ], 'startTime');

    // Legacy: set the salmonid_guess based on the actual data we now have
    for (let schedule of schedules) {
      let king = schedule.setting?.boss?.name;

      schedule.__splatoon3ink_king_salmonid_guess = king;
    }
  }

  nextKingSalmonid(last = null) {
    const sequence = ['Cohozuna', 'Horrorboros'];

    let index = sequence.indexOf(last) + 1;

    return sequence[index % sequence.length];
  }
}
