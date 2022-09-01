import Tweet from '../Tweet.mjs';

export default class TweetGenerator
{
  async shouldTweet() {
    return true;
  }

  async getTweet() {
    const tweet = new Tweet;
    tweet.status = await this._getStatus();

    let media = await this._getMedia();
    if (media && !Array.isArray(media)) {
      media = [media];
    }
    tweet.media = media;

    return tweet;
  }

  async _getStatus () {
    //
  }

  async _getMedia() {
    //
  }
}
