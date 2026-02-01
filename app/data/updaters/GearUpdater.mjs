import DataUpdater from './DataUpdater.mjs';

export default class GearUpdater extends DataUpdater
{
  name = 'Gear';
  filename = 'gear';

  imagePaths = [
    '$..image.url',
  ];

  derivedIds = [
    '$..gear',
    '$..usualGearPower',
    '$..primaryGearPower',
    '$..additionalGearPowers.*',
  ];

  localizations = [
    {
      key: 'brands',
      nodes: '$..brand',
      id: 'id',
      values: 'name',
    },
    {
      key: 'gear',
      nodes: '$..gear',
      id: '__splatoon3ink_id',
      values: 'name',
    },
    {
      key: 'powers',
      nodes: [
        '$..usualGearPower',
        '$..primaryGearPower',
        '$..additionalGearPowers.*',
      ],
      id: '__splatoon3ink_id',
      values: 'name',
    },
  ];

  async getData(locale) {
    return this.splatnet(locale).getGesotownData();
  }
}
