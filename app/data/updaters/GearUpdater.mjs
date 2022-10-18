import DataUpdater from "./DataUpdater.mjs";
import jsonpath from 'jsonpath';
import { deriveId } from "../../common/util.mjs";

export default class GearUpdater extends DataUpdater
{
  name = 'Gear';
  filename = 'gear';

  imagePaths = [
    '$..image.url',
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
    let data = await this.splatnet(locale).getGesotownData();

    jsonpath.apply(data, '$..gear', deriveId);
    jsonpath.apply(data, '$..usualGearPower', deriveId);
    jsonpath.apply(data, '$..primaryGearPower', deriveId);
    jsonpath.apply(data, '$..additionalGearPowers.*', deriveId);

    return data;
  }
}
