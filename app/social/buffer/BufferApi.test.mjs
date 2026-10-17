import { afterEach, describe, expect, it, vi } from 'vitest';
import BufferApi from './BufferApi.mjs';

describe('BufferApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses variables, immediate automatic publishing, images, and alt text', async () => {
    const post = { id: 'post-1', status: 'scheduled', channelId: 'twitter-1' };
    const fetch = vi.fn().mockResolvedValue(Response.json({ data: { createPost: { post } } }));
    vi.stubGlobal('fetch', fetch);
    const assets = [{
      image: {
        url: 'https://images.example/rotation.png',
        metadata: { altText: 'Stages' },
      },
    }];

    await expect(new BufferApi('secret').createPost('twitter-1', 'New "rotation"\nNow!', assets))
      .resolves.toEqual(post);

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://api.buffer.com');
    expect(options.headers.Authorization).toBe('Bearer secret');
    expect(JSON.parse(options.body).variables.input).toEqual({
      channelId: 'twitter-1',
      text: 'New "rotation"\nNow!',
      assets,
      mode: 'shareNow',
      schedulingType: 'automatic',
      saveToDraft: false,
      needsApproval: false,
    });
  });

  it('reports mutation errors, GraphQL errors, and HTTP failures without retrying', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: { createPost: { message: 'Queue full' } } }))
      .mockResolvedValueOnce(Response.json({ errors: [{ message: 'Internal failure' }] }))
      .mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response('Rate limited', { status: 429 }));
    vi.stubGlobal('fetch', fetch);
    const api = new BufferApi('secret');

    await expect(api.createPost('twitter-1', 'Post', [])).rejects.toThrow('Queue full');
    await expect(api.createPost('twitter-1', 'Post', [])).rejects.toThrow('Internal failure');
    await expect(api.createPost('twitter-1', 'Post', [])).rejects.toThrow('Buffer HTTP 503');
    await expect(api.createPost('twitter-1', 'Post', [])).rejects.toThrow('Buffer HTTP 429');
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('discovers channels with read-only queries', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: { account: { organizations: [{ id: 'org-1' }] } } }))
      .mockResolvedValueOnce(Response.json({
        data: { channels: [{ id: 'twitter-1', service: 'twitter' }] },
      }));
    vi.stubGlobal('fetch', fetch);

    await expect(new BufferApi('secret').listChannels()).resolves.toEqual([
      { id: 'twitter-1', service: 'twitter' },
    ]);

    for (const [, options] of fetch.mock.calls) {
      expect(JSON.parse(options.body).query).not.toContain('mutation');
    }
  });
});
