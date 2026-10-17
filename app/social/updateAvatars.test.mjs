import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs/promises';
import ValueCache from '../common/ValueCache.mjs';
import BlueskyClient from './clients/BlueskyClient.mjs';
import BufferTwitterClient from './clients/BufferTwitterClient.mjs';
import TwitterClient from './clients/TwitterClient.mjs';
import { defaultClients } from './index.mjs';
import { updateAvatars } from './updateAvatars.mjs';

vi.mock('../common/prefixedConsole.mjs', () => ({
  default: () => ({ log: vi.fn(), error: vi.fn() }),
}));

const twitterCredentials = [
  'TWITTER_CONSUMER_KEY',
  'TWITTER_CONSUMER_SECRET',
  'TWITTER_ACCESS_TOKEN_KEY',
  'TWITTER_ACCESS_TOKEN_SECRET',
];

describe('Seasonal profile updates', () => {
  let cache;
  let updateImage;
  let updateProfile;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 12));

    for (let key of twitterCredentials) {
      vi.stubEnv(key, 'test-credential');
    }

    vi.stubEnv('MASTODON_ACCESS_TOKEN', '');
    vi.stubEnv('BLUESKY_PASSWORD', '');
    vi.stubEnv('BUFFER_API_KEY', '');
    vi.stubEnv('BUFFER_TWITTER_CHANNEL_ID', '');
    vi.stubEnv('BLUESKY_JP_PASSWORD', '');

    cache = new Map;

    vi.spyOn(ValueCache.prototype, 'getData').mockImplementation(async function () {
      return cache.get(this._key);
    });

    vi.spyOn(ValueCache.prototype, 'setData').mockImplementation(async function (value) {
      cache.set(this._key, value);
    });

    updateImage = vi.fn().mockResolvedValue({});
    updateProfile = vi.fn().mockResolvedValue({});

    vi.spyOn(TwitterClient.prototype, 'api').mockReturnValue({
      v1: {
        updateAccountProfileImage: updateImage,
        updateAccountProfile: updateProfile,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('keeps Twitter posts on Buffer', () => {
    let clients = defaultClients();

    expect(clients.some(client => client instanceof BufferTwitterClient)).toBe(true);
    expect(clients.some(client => client instanceof TwitterClient)).toBe(false);
  });

  it.each(twitterCredentials)('skips Twitter when %s is missing', async key => {
    vi.stubEnv(key, '');

    await updateAvatars();

    expect(updateImage).not.toHaveBeenCalled();
    expect(updateProfile).not.toHaveBeenCalled();
    expect(cache.size).toBe(0);
  });

  it('updates the seasonal profile without Buffer credentials and skips it on the next run', async () => {
    let avatar = await fs.readFile(new URL('./avatars/halloween.png', import.meta.url));

    await updateAvatars();
    await updateAvatars();

    expect(updateImage).toHaveBeenCalledExactlyOnceWith(avatar);
    expect(updateProfile).toHaveBeenCalledExactlyOnceWith({ name: 'Splatoon3.eek 🎃' });
    expect(cache.get('social.twitter.avatar')).toBe('halloween');
  });

  it('retries on the next run when only the image update succeeds', async () => {
    updateProfile.mockRejectedValueOnce(new Error('X unavailable'));

    await updateAvatars();

    expect(cache.has('social.twitter.avatar')).toBe(false);

    await updateAvatars();

    expect(updateImage).toHaveBeenCalledTimes(2);
    expect(updateProfile).toHaveBeenCalledTimes(2);
    expect(cache.get('social.twitter.avatar')).toBe('halloween');
  });

  it('leaves Japanese profiles unchanged when Japanese credentials are configured', async () => {
    vi.stubEnv('BLUESKY_JP_SERVICE', 'https://bsky.social');
    vi.stubEnv('BLUESKY_JP_IDENTIFIER', 'jp.splatoon3.ink');
    vi.stubEnv('BLUESKY_JP_PASSWORD', 'jp-credential');

    const updateBlueskyProfile = vi.spyOn(BlueskyClient.prototype, 'updateProfile').mockResolvedValue();

    await updateAvatars();

    expect(updateProfile).toHaveBeenCalledExactlyOnceWith({ name: 'Splatoon3.eek 🎃' });
    expect(updateBlueskyProfile).not.toHaveBeenCalled();
    expect([...cache.keys()]).toEqual(['social.twitter.avatar']);
  });
});
