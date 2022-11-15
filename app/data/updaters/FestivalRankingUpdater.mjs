import DataUpdater from "./DataUpdater.mjs";

export default class FestivalRankingUpdater extends DataUpdater
{
  name = 'FestivalRankingUpdater';
  filename = 'festivals.ranking';

  constructor(region = null, festID = null) {
    super(region);

    this.festID = festID;
    this.filename += `.${region}.${festID}`;
  }

  imagePaths = [
    '$..image.url',
    '$..originalImage.url',
    '$..image2d.url',
    '$..image2dThumbnail.url',
    '$..image3d.url',
    '$..image3dThumbnail.url',
  ];

  getData(locale) {
    return this.splatnet(locale).getFestRankingData(this.festID);
  }
}
