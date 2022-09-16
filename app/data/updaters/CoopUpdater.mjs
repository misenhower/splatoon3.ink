import DataUpdater from "./DataUpdater.mjs";

export default class StageScheduleUpdater extends DataUpdater
{
  name = 'Co-Op';
  filename = 'coop.json';

  imagePaths = [
    '$..image.url',
  ];

  getData() {
    return this.splatnet.getCoopHistoryData();
  }
}
