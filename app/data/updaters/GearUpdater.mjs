import DataUpdater from "./DataUpdater.mjs";

export default class GearUpdater extends DataUpdater
{
  name = 'Gear';
  filename = 'gear';

  imagePaths = [
    '$..image.url',
  ];

  getData() {
    return this.splatnet.getGesotownData();
  }
}
