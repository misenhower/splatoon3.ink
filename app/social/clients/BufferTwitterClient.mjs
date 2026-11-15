import Client from './Client.mjs';
import BufferApi from '../buffer/BufferApi.mjs';
import BufferMedia from '../buffer/BufferMedia.mjs';
import prefixedConsole from '../../common/prefixedConsole.mjs';
import ValueCache from '../../common/ValueCache.mjs';

// Every Buffer request, queries included, counts against the API quota (2,000 per 30 days
// on the Free plan), so a successful channel check is reused instead of repeated per run.
const CHANNEL_CHECK_TTL_MS = 24 * 60 * 60 * 1000;

export default class BufferTwitterClient extends Client {
  constructor({
    key = 'twitter',
    name = 'Twitter (Buffer)',
    locale = 'en-US',
    envPrefix = 'BUFFER_TWITTER',
    api,
    media,
    channelId,
    channelCache,
  } = {}) {
    super();
    this.key = key;
    this.name = name;
    this.locale = locale;
    this.channelId = channelId ?? process.env[`${envPrefix}_CHANNEL_ID`];
    this.api = api ?? new BufferApi;
    this.media = media ?? new BufferMedia;
    this.channelCache = channelCache ?? new ValueCache(`buffer.channel.${this.channelId}`);
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
    if (await this.channelCache.getData()) return;

    const channel = await this.api.getChannel(this.channelId);

    if (channel?.id !== this.channelId || channel.service !== 'twitter'
      || channel.isDisconnected || channel.isLocked) {
      throw new Error('BUFFER_TWITTER_CHANNEL_ID must identify a connected, unlocked X/Twitter channel');
    }

    // Only success is cached; a channel locked later still fails at createPost.
    await this.channelCache.setData(true, new Date(Date.now() + CHANNEL_CHECK_TTL_MS));
  }
}
