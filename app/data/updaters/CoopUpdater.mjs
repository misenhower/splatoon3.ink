import DataUpdater from "./DataUpdater.mjs";

export default class CoopUpdater extends DataUpdater
{
  name = 'Co-Op';
  filename = 'coop';

  imagePaths = [
    '$..image.url',
  ];

  derivedIds = [
    '$..monthlyGear',
  ];

  localizations = [
    {
      key: 'gear',
      nodes: '$..monthlyGear',
      id: '__splatoon3ink_id',
      values: 'name',
    },
  ];

  getData(locale) {
    return this.splatnet(locale).getCoopHistoryData();
  }
}
