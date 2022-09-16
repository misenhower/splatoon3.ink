import DataUpdater from "./DataUpdater.mjs";

export default class CoopUpdater extends DataUpdater
{
  name = 'Co-Op';
  filename = 'coop';

  imagePaths = [
    '$..image.url',
  ];

  getData() {
    return this.splatnet.getCoopHistoryData();
  }
}
