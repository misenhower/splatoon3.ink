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

  getData() {
    return this.splatnet.getStageScheduleData();
  }
}
