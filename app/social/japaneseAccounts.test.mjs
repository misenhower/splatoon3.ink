import { afterEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { RichText } from '@atproto/api';
import { defaultClients, defaultStatusGenerators, japanesePublishingEnabled } from './index.mjs';
import StatusGeneratorManager from './StatusGeneratorManager.mjs';
import BlueskyClient from './clients/BlueskyClient.mjs';
import BufferTwitterClient from './clients/BufferTwitterClient.mjs';
import ValueCache from '../common/ValueCache.mjs';
import { validateSocialPost } from './validateSocialPost.mjs';
import { MissingTranslationError } from './i18n/SocialMessages.mjs';
import ScreenshotHelper from '../screenshots/ScreenshotHelper.mjs';

vi.mock('../common/prefixedConsole.mjs', () => ({
  default: () => ({ log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock('@sentry/node', () => ({ captureException: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('Japanese account routing', () => {
  it('requires an explicit enable flag', () => {
    vi.stubEnv('SOCIAL_JP_ENABLED', '');
    expect(japanesePublishingEnabled()).toBe(false);
    vi.stubEnv('SOCIAL_JP_ENABLED', 'true');
    expect(japanesePublishingEnabled()).toBe(true);
  });

  it('uses only JP Twitter and Bluesky, preserving English keys', () => {
    expect(defaultClients('ja-JP').map(c => c.key)).toEqual(['twitter.jp', 'bluesky.jp']);
    expect(defaultClients().map(c => c.key)).toContain('twitter');
    expect(defaultClients().map(c => c.key)).toContain('bluesky');
    expect(defaultStatusGenerators({ locale: 'ja-JP' }).every(g => g.locale === 'ja-JP')).toBe(true);
    expect(defaultStatusGenerators().some(g => /countdown|gear.salmonrun/.test(g.key))).toBe(false);
  });

  it('never falls back to English credentials or the English Buffer channel', async () => {
    vi.stubEnv('BLUESKY_IDENTIFIER', 'english.example');
    vi.stubEnv('BLUESKY_PASSWORD', 'english-password');
    vi.stubEnv('BLUESKY_SERVICE', 'https://bsky.social');
    vi.stubEnv('BUFFER_API_KEY', 'buffer-key');
    vi.stubEnv('BUFFER_TWITTER_CHANNEL_ID', 'english-channel');
    vi.stubEnv('BLUESKY_JP_IDENTIFIER', '');
    vi.stubEnv('BLUESKY_JP_PASSWORD', '');
    vi.stubEnv('BUFFER_TWITTER_JP_CHANNEL_ID', '');

    for (const client of defaultClients('ja-JP')) {
      expect(!!await client.canSend()).toBe(false);
    }
  });

  it('delivers Japanese text and alt text to the configured Buffer channel', async () => {
    const api = {
      getChannel: vi.fn().mockResolvedValue({ id: 'jp-channel', service: 'twitter' }),
      createPost: vi.fn().mockResolvedValue({ id: 'posted', status: 'sent' }),
    };
    const client = new BufferTwitterClient({
      locale: 'ja-JP',
      channelId: 'jp-channel',
      api,
      media: { upload: vi.fn().mockResolvedValue({ url: 'https://example.com/image.png' }) },
    });
    const status = {
      locale: 'ja-JP',
      status: 'ステージ情報 #スプラトゥーン3',
      media: [{ altText: '日本語の説明' }],
    };

    await client.send(status, { key: 'schedules' });

    expect(api.createPost).toHaveBeenCalledWith('jp-channel', status.status, [{
      image: {
        url: 'https://example.com/image.png',
        metadata: { altText: '日本語の説明' },
      },
    }]);
  });

  it('marks Bluesky posts as Japanese and preserves Japanese alt text', async () => {
    const client = new BlueskyClient({ locale: 'ja-JP' });
    client._agent = {
      uploadBlob: vi.fn().mockResolvedValue({ data: { blob: 'blob' } }),
      post: vi.fn().mockResolvedValue({}),
    };
    vi.spyOn(RichText.prototype, 'detectFacets').mockResolvedValue();
    const file = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: '#000',
      },
    }).png().toBuffer();

    await client.send({
      locale: 'ja-JP',
      status: 'ステージ情報',
      media: [{ file, altText: '日本語の説明' }],
    }, { key: 'schedules' });

    expect(client._agent.post).toHaveBeenCalledWith(expect.objectContaining({
      text: 'ステージ情報',
      langs: ['ja'],
      embed: expect.objectContaining({ images: [expect.objectContaining({ alt: '日本語の説明' })] }),
    }));
  });

  it('tracks successful accounts independently and retries only the failed account', async () => {
    const markers = new Map;
    vi.spyOn(ValueCache.prototype, 'getData').mockImplementation(async function () {
      return markers.get(this.path);
    });
    vi.spyOn(ValueCache.prototype, 'setData').mockImplementation(async function (value) {
      markers.set(this.path, value);
    });

    const generator = defaultStatusGenerators({ locale: 'ja-JP' })[0];
    vi.spyOn(generator, 'getDataTime').mockResolvedValue(1000);
    const good = { key: 'bluesky.jp', send: vi.fn().mockResolvedValue() };
    const bad = { key: 'twitter.jp', send: vi.fn().mockRejectedValue(new Error('Unavailable')) };
    const english = { key: 'bluesky' };
    const manager = new StatusGeneratorManager;

    await manager._sendToClient(generator, {}, good);
    await manager._sendToClient(generator, {}, bad);

    expect(await generator.shouldPost(good)).toBe(false);
    expect(await generator.shouldPost(bad)).toBe(true);
    expect(await generator.shouldPost(english)).toBe(true);
  });

  it('leaves missing translations eligible for a later run', async () => {
    vi.spyOn(ScreenshotHelper.prototype, 'open').mockResolvedValue();
    vi.spyOn(ScreenshotHelper.prototype, 'close').mockResolvedValue();
    const marker = vi.fn();
    const generator = {
      shouldPost: vi.fn().mockResolvedValue(true),
      getStatus: vi.fn().mockRejectedValue(new MissingTranslationError('Missing stage')),
      updatelastPostCache: marker,
    };
    const client = { canSend: async () => true, send: vi.fn() };

    await new StatusGeneratorManager([generator], [client]).sendStatuses();

    expect(client.send).not.toHaveBeenCalled();
    expect(marker).not.toHaveBeenCalled();
  });
});

describe('Japanese post limits', () => {
  it('counts Japanese using Twitter weights rather than string length', () => {
    expect(() => validateSocialPost({ locale: 'ja-JP', status: 'あ'.repeat(140) }, 'twitter', 'ja-JP')).not.toThrow();
    expect(() => validateSocialPost({ locale: 'ja-JP', status: 'あ'.repeat(141) }, 'twitter', 'ja-JP')).toThrow('weighted');
    expect(() => validateSocialPost({ locale: 'ja-JP', status: 'あ'.repeat(300) }, 'bluesky', 'ja-JP')).not.toThrow();
    expect(() => validateSocialPost({ locale: 'ja-JP', status: 'あ'.repeat(301) }, 'bluesky', 'ja-JP')).toThrow('Bluesky');
  });

  it('rejects wrong-language routing before delivery', async () => {
    const client = new BufferTwitterClient({ locale: 'ja-JP', api: { getChannel: vi.fn() } });

    await expect(client.send({ locale: 'en-US', status: 'English' }, {})).rejects.toThrow('en-US content');
    expect(client.api.getChannel).not.toHaveBeenCalled();
  });
});
