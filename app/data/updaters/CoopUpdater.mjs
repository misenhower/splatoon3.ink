import jsonpath from 'jsonpath';
import { deriveId } from "../../common/util.mjs";
import DataUpdater from "./DataUpdater.mjs";

export default class CoopUpdater extends DataUpdater
{
  name = 'Co-Op';
  filename = 'coop';

  imagePaths = [
    '$..image.url',
  ];

  localizations = [
    {
      key: 'gear',
      nodes: '$..monthlyGear',
      id: '__splatoon3ink_id',
      values: 'name',
    },
  ];

  async getData(locale) {
    let data = await this.splatnet(locale).getCoopHistoryData();

    jsonpath.apply(data, '$..monthlyGear', deriveId);

    return data;
  }
}
