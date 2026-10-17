import { beforeEach, describe, expect, it, vi } from 'vitest';
import BufferTwitterClient from './BufferTwitterClient.mjs';

vi.mock('../../common/prefixedConsole.mjs', () => ({
  default: () => ({ log: vi.fn(), warn: vi.fn() }),
}));

describe('BufferTwitterClient', () => {
  let api;
  let media;
  let generator;
  let status;

  const client = () => new BufferTwitterClient({ api, media, channelId: 'twitter-1' });

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
});
