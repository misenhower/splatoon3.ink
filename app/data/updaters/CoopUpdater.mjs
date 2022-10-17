import DataUpdater from "./DataUpdater.mjs";

export default class CoopUpdater extends DataUpdater
{
  name = 'Co-Op';
  filename = 'coop';

  imagePaths = [
    '$..image.url',
  ];

  getData(locale) {
    return this.splatnet(locale).getCoopHistoryData();
  }
}
