import { afterEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { BskyAgent, RichText } from '@atproto/api';
import { defaultClients, defaultStatusGenerators, sendStatuses } from './index.mjs';
import StatusGeneratorManager from './StatusGeneratorManager.mjs';
import ValueCache from '../common/ValueCache.mjs';
import { MissingTranslationError } from './i18n/SocialMessages.mjs';
import ScreenshotHelper from '../screenshots/ScreenshotHelper.mjs';

vi.mock('../common/prefixedConsole.mjs', () => ({
  default: () => ({ log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock('@sentry/node', () => ({ captureException: vi.fn() }));
vi.mock('../sync/index.mjs', () => ({ canUpload: () => false }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('Japanese account routing', () => {
  it('includes both languages in the normal publishing run', async () => {
    const locales = [];

    vi.spyOn(StatusGeneratorManager.prototype, 'sendStatuses').mockImplementation(async function () {
      locales.push(this.generators[0].locale);
    });

    await sendStatuses();

    expect(locales).toEqual(['en-US', 'ja-JP']);
  });

  it.each(['twitter.jp', 'bluesky.jp'])('enables %s independently when its credentials are configured', async key => {
    vi.stubEnv('BUFFER_API_KEY', 'buffer-key');
    vi.stubEnv('BUFFER_TWITTER_JP_CHANNEL_ID', key === 'twitter.jp' ? 'jp-channel' : '');
    vi.stubEnv('BLUESKY_JP_SERVICE', 'https://bsky.social');
    vi.stubEnv('BLUESKY_JP_IDENTIFIER', 'jp.splatoon3.ink');
    vi.stubEnv('BLUESKY_JP_PASSWORD', key === 'bluesky.jp' ? 'jp-password' : '');

    const manager = new StatusGeneratorManager([], defaultClients('ja-JP'));
    const clients = await manager._getAvailableClients();

    expect(clients.map(client => client.key)).toEqual([key]);
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

  it('authenticates the Japanese Bluesky account with its own credentials', async () => {
    vi.stubEnv('BLUESKY_IDENTIFIER', 'english.example');
    vi.stubEnv('BLUESKY_PASSWORD', 'english-password');
    vi.stubEnv('BLUESKY_JP_SERVICE', 'https://bsky.social');
    vi.stubEnv('BLUESKY_JP_IDENTIFIER', 'jp.splatoon3.ink');
    vi.stubEnv('BLUESKY_JP_PASSWORD', 'jp-password');
    const login = vi.spyOn(BskyAgent.prototype, 'login').mockResolvedValue();
    const client = defaultClients('ja-JP').find(client => client.key === 'bluesky.jp');

    await client.login();

    expect(login).toHaveBeenCalledExactlyOnceWith({
      identifier: 'jp.splatoon3.ink',
      password: 'jp-password',
    });
  });

  it('delivers Japanese text and alt text to the configured Buffer channel', async () => {
    const api = {
      getChannel: vi.fn().mockResolvedValue({ id: 'jp-channel', service: 'twitter' }),
      createPost: vi.fn().mockResolvedValue({ id: 'posted', status: 'sent' }),
    };

    vi.stubEnv('BUFFER_TWITTER_JP_CHANNEL_ID', 'jp-channel');
    const client = defaultClients('ja-JP').find(client => client.key === 'twitter.jp');
    client.api = api;
    client.media = { upload: vi.fn().mockResolvedValue({ url: 'https://example.com/image.png' }) };

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
    const client = defaultClients('ja-JP').find(client => client.key === 'bluesky.jp');
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
    const good = {
      key: 'bluesky.jp',
      locale: 'ja-JP',
      send: vi.fn().mockResolvedValue(),
    };
    const bad = {
      key: 'twitter.jp',
      locale: 'ja-JP',
      send: vi.fn().mockRejectedValue(new Error('Unavailable')),
    };
    const english = { key: 'bluesky' };
    const manager = new StatusGeneratorManager;

    await manager._sendToClient(generator, { locale: 'ja-JP' }, good);
    await manager._sendToClient(generator, { locale: 'ja-JP' }, bad);

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
