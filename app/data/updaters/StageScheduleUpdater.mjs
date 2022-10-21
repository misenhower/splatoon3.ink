import DataUpdater from "./DataUpdater.mjs";

export default class StageScheduleUpdater extends DataUpdater
{
  name = 'Schedules';
  filename = 'schedules';

  imagePaths = [
    '$..image.url',
    '$..originalImage.url',
    '$..thumbnailImage.url',
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

  getData(locale) {
    return this.splatnet(locale).getStageScheduleData();
  }
}
