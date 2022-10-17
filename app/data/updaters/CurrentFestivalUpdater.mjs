import DataUpdater from "./DataUpdater.mjs";

export default class CurrentFestivalUpdater extends DataUpdater
{
  name = 'Current Festival';
  filename = 'currentfest';

  constructor(region = null) {
    super(region);

    this.filename += `.${region}`;
  }

  imagePaths = [
    '$..image.url',
  ];

  getData(locale) {
    return this.splatnet(locale).getCurrentFestData();
  }
}
