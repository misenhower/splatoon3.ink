import DataUpdater from "./DataUpdater.mjs";

export default class StagesUpdater extends DataUpdater
{
  name = 'Stages';
  filename = 'stages';

  imagePaths = [
    '$..image.url',
    '$..originalImage.url',
  ];

  localizations = [
    {
      key: 'stages',
      nodes: '$..stageRecords.nodes.*',
      id: 'id',
      values: 'name',
    },
  ];

  getData(locale) {
    return this.splatnet(locale).getStageRecordData();
  }
}
