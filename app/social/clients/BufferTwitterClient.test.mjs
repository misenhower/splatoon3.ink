import { beforeEach, describe, expect, it, vi } from 'vitest';
import BufferTwitterClient from './BufferTwitterClient.mjs';

vi.mock('../../common/prefixedConsole.mjs', () => ({
  default: () => ({ log: vi.fn(), warn: vi.fn() }),
}));

describe('BufferTwitterClient', () => {
  let api;
  let media;
  let channelCache;
  let generator;
  let status;

  const client = () => new BufferTwitterClient({ api, media, channelCache, channelId: 'twitter-1' });

  // Stands in for ValueCache: holds one value with an optional expiry.
  const memoryCache = () => {
    let item = null;

    return {
      getData: vi.fn(async () => (item && !(item.expires && item.expires < new Date)) ? item.data : null),
      setData: vi.fn(async (data, expires = null) => { item = { data, expires }; }),
    };
  };

  beforeEach(() => {
    api = {
      getChannel: vi.fn().mockResolvedValue({ id: 'twitter-1', service: 'twitter' }),
      createPost: vi.fn().mockResolvedValue({ id: 'post-1', status: 'scheduled', channelId: 'twitter-1' }),
    };
    media = {
      upload: vi.fn().mockResolvedValue({
        key: 'buffer-twitter/image.png',
        url: 'https://images.example/image.png',
      }),
    };
    channelCache = memoryCache();
    generator = { key: 'schedules' };
    status = {
      status: 'Map rotation',
      media: [{ file: Buffer.from('png'), type: 'image/png', altText: 'Stages and rules' }],
    };
  });

  it.each(['scheduled', 'sending', 'sent'])('succeeds when Buffer accepts the post as %s', async (postStatus) => {
    api.createPost.mockImplementation(async () => {
      expect(media.upload).toHaveBeenCalledOnce();
      return { id: 'post-1', status: postStatus, channelId: 'twitter-1' };
    });

    await expect(client().send(status, generator)).resolves.toBeUndefined();

    expect(api.createPost).toHaveBeenCalledWith('twitter-1', 'Map rotation', [{
      image: {
        url: 'https://images.example/image.png',
        metadata: { altText: 'Stages and rules' },
      },
    }]);
  });

  it('does not create a post when an image upload fails', async () => {
    status.media.push(status.media[0]);
    media.upload.mockResolvedValueOnce({ key: 'first.png', url: 'https://images.example/first.png' })
      .mockRejectedValueOnce(new Error('Upload failed'));

    await expect(client().send(status, generator)).rejects.toThrow('Upload failed');

    expect(api.createPost).not.toHaveBeenCalled();
  });

  it('propagates submission errors without retrying', async () => {
    api.createPost.mockRejectedValue(new Error('Connection lost'));

    await expect(client().send(status, generator)).rejects.toThrow('Connection lost');

    expect(api.createPost).toHaveBeenCalledOnce();
  });

  it.each(['draft', 'needs_approval', 'error'])('reports a %s response as a failure', async (postStatus) => {
    api.createPost.mockResolvedValue({ id: 'post-1', status: postStatus, channelId: 'twitter-1' });

    await expect(client().send(status, generator)).rejects.toThrow(`is ${postStatus}`);
  });

  it('refuses a non-Twitter channel before uploading', async () => {
    api.getChannel.mockResolvedValue({ id: 'twitter-1', service: 'bluesky' });

    await expect(client().send(status, generator)).rejects.toThrow('X/Twitter channel');
    expect(media.upload).not.toHaveBeenCalled();
  });

  it('checks the channel once a day across runs instead of on every run', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-10T00:00:00Z') });

    try {
      // Each run builds a new client, as sendStatuses does.
      await client().send(status, generator);
      await client().send(status, generator);
      expect(api.getChannel).toHaveBeenCalledOnce();

      vi.setSystemTime(new Date('2026-11-11T00:00:01Z'));
      await client().send(status, generator);
      expect(api.getChannel).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('checks again on the next run after a failed check', async () => {
    api.getChannel.mockResolvedValueOnce({ id: 'twitter-1', service: 'twitter', isLocked: true });

    await expect(client().send(status, generator)).rejects.toThrow('X/Twitter channel');
    await client().send(status, generator);

    expect(api.getChannel).toHaveBeenCalledTimes(2);
    expect(channelCache.setData).toHaveBeenCalledOnce();
  });
});
