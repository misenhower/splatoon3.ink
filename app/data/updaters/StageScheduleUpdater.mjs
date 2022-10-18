import DataUpdater from "./DataUpdater.mjs";
import jsonpath from 'jsonpath';
import { deriveId } from "../../common/util.mjs";

export default class StageScheduleUpdater extends DataUpdater
{
  name = 'Schedules';
  filename = 'schedules';

  imagePaths = [
    '$..image.url',
    '$..originalImage.url',
    '$..thumbnailImage.url',
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

    jsonpath.apply(data, '$..weapons.*', deriveId);

    return data;
  }
}
