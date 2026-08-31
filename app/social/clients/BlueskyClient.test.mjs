import { afterEach, describe, expect, it, vi } from 'vitest';
import { BskyAgent } from '@atproto/api';
import BlueskyClient from './BlueskyClient.mjs';

describe('BlueskyClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('logs in with the current Atproto agent API', async () => {
    vi.stubEnv('BLUESKY_SERVICE', 'https://bsky.social');
    vi.stubEnv('BLUESKY_IDENTIFIER', 'test.bsky.social');
    vi.stubEnv('BLUESKY_PASSWORD', 'test-password');
    const login = vi.spyOn(BskyAgent.prototype, 'login').mockResolvedValue();
    const client = new BlueskyClient;

    await client.login();

    expect(login).toHaveBeenCalledWith({
      identifier: 'test.bsky.social',
      password: 'test-password',
    });
  });
});
