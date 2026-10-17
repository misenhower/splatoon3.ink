import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureException } from '@sentry/node';
import StatusGeneratorManager from './StatusGeneratorManager.mjs';
import BufferTwitterClient from './clients/BufferTwitterClient.mjs';
import { defaultClients } from './index.mjs';

vi.mock('@sentry/node', () => ({ captureException: vi.fn() }));
vi.mock('../common/prefixedConsole.mjs', () => ({
  default: () => ({ log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

describe('social posting', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it.each([
    { apiKey: '', channelId: '', enabled: false },
    { apiKey: 'test-key', channelId: '', enabled: false },
    { apiKey: '', channelId: 'twitter-1', enabled: false },
    { apiKey: 'test-key', channelId: 'twitter-1', enabled: true },
  ])('enables Buffer only with both credentials: $enabled', async ({ apiKey, channelId, enabled }) => {
    vi.stubEnv('BUFFER_API_KEY', apiKey);
    vi.stubEnv('BUFFER_TWITTER_CHANNEL_ID', channelId);
    vi.stubEnv('R2_ENDPOINT', '');

    const twitterClients = defaultClients().filter(client => client.key === 'twitter');
    expect(twitterClients).toHaveLength(1);
    expect(twitterClients[0]).toBeInstanceOf(BufferTwitterClient);

    const manager = new StatusGeneratorManager([], twitterClients);
    expect(await manager._getAvailableClients()).toEqual(enabled ? twitterClients : []);
  });

  it('lets another network finish while Buffer is still waiting on its API', async () => {
    vi.stubEnv('BUFFER_API_KEY', 'test-key');
    const channel = Promise.withResolvers();
    const otherFinished = Promise.withResolvers();
    const buffer = new BufferTwitterClient({
      channelId: 'twitter-1',
      api: {
        getChannel: vi.fn().mockReturnValue(channel.promise),
        createPost: vi.fn().mockResolvedValue({ id: 'post-1', status: 'scheduled' }),
      },
      media: {
        canUpload: () => true,
        upload: vi.fn().mockResolvedValue({ url: 'https://images.example/image.png' }),
      },
    });
    const other = {
      canSend: async () => true,
      send: vi.fn().mockResolvedValue(),
    };
    const marker = vi.fn(async client => {
      if (client === other) otherFinished.resolve();
    });
    const generator = { key: 'schedules', updatelastPostCache: marker };
    const manager = new StatusGeneratorManager([generator], [buffer, other]);
    const status = { status: 'Rotation', media: [{ altText: 'Stages' }] };
    vi.spyOn(manager, '_getStatuses').mockImplementation(clients => [
      Promise.resolve({ generator, status, clients }),
    ]);

    const sending = manager.sendStatuses();

    try {
      await otherFinished.promise;
      expect(other.send).toHaveBeenCalledOnce();
      expect(buffer.api.createPost).not.toHaveBeenCalled();
      expect(marker).toHaveBeenCalledWith(other);
      expect(marker).not.toHaveBeenCalledWith(buffer);
    } finally {
      channel.resolve({ id: 'twitter-1', service: 'twitter' });
      await sending;
    }

    expect(marker).toHaveBeenCalledWith(buffer);
  });

  it('does not update the posting marker when submission fails', async () => {
    const generator = { updatelastPostCache: vi.fn() };
    const client = { send: vi.fn().mockRejectedValue(new Error('Buffer unavailable')) };

    await new StatusGeneratorManager()._sendToClient(generator, {}, client);

    expect(generator.updatelastPostCache).not.toHaveBeenCalled();
  });

  it.each([
    { postLocale: 'en-US', accountLocale: 'ja-JP' },
    { postLocale: 'ja-JP', accountLocale: 'en-US' },
    { postLocale: 'ja-JP', accountLocale: undefined },
  ])('rejects $postLocale posts routed to a $accountLocale client before delivery', async ({ postLocale, accountLocale }) => {
    const generator = { updatelastPostCache: vi.fn() };
    const client = { locale: accountLocale, send: vi.fn() };
    const status = { locale: postLocale, status: 'Post text' };

    await new StatusGeneratorManager()._sendToClient(generator, status, client);

    expect(client.send).not.toHaveBeenCalled();
    expect(generator.updatelastPostCache).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledExactlyOnceWith(
      new Error(`Cannot send ${postLocale} content to a ${accountLocale ?? 'en-US'} account`),
    );
  });
});
