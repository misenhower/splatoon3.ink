import Client from './Client.mjs';
import BufferApi from '../buffer/BufferApi.mjs';
import BufferMedia from '../buffer/BufferMedia.mjs';
import prefixedConsole from '../../common/prefixedConsole.mjs';

export default class BufferTwitterClient extends Client {
  constructor({
    key = 'twitter',
    name = 'Twitter (Buffer)',
    locale = 'en-US',
    envPrefix = 'BUFFER_TWITTER',
    api,
    media,
    channelId,
  } = {}) {
    super();
    this.key = key;
    this.name = name;
    this.locale = locale;
    this.channelId = channelId ?? process.env[`${envPrefix}_CHANNEL_ID`];
    this.api = api ?? new BufferApi;
    this.media = media ?? new BufferMedia;
    this.console = prefixedConsole('Social', this.name);
  }

  async canSend() {
    return !!(process.env.BUFFER_API_KEY && this.channelId);
  }

  async send(status, generator) {
    if (!status.status || !status.media?.length || status.media.length > 4) {
      throw new Error('Buffer Twitter posts require text and one to four images');
    }

    await this._checkChannel();

    const images = [];

    for (const media of status.media) {
      images.push(await this.media.upload(media));
    }

    const post = await this.api.createPost(
      this.channelId,
      status.status,
      images.map((image, index) => ({
        image: {
          url: image.url,
          metadata: { altText: status.media[index].altText || '' },
        },
      })),
    );

    if (!['sent', 'scheduled', 'sending'].includes(post.status)) {
      throw new Error(`Buffer post ${post.id} is ${post.status}; resolve it in Buffer`);
    }

    this.console.log(`Accepted ${generator.key}: ${post.externalLink || post.id}`);
  }

  async _checkChannel() {
    if (this._channelChecked) return;

    const channel = await this.api.getChannel(this.channelId);

    if (channel?.id !== this.channelId || channel.service !== 'twitter'
      || channel.isDisconnected || channel.isLocked) {
      throw new Error('BUFFER_TWITTER_CHANNEL_ID must identify a connected, unlocked X/Twitter channel');
    }

    this._channelChecked = true;
  }
}
