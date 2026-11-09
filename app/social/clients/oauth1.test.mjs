import { describe, expect, it } from 'vitest';
import { oauth1Header } from './oauth1.mjs';

describe('oauth1Header', () => {
  it('matches the signature from X\'s documentation example', async () => {
    let header = await oauth1Header({
      method: 'POST',
      url: 'https://api.twitter.com/1.1/statuses/update.json?include_entities=true',
      params: { status: 'Hello Ladies + Gentlemen, a signed OAuth request!' },
      credentials: {
        consumerKey: 'xvz1evFS4wEEPTGEFPHBog',
        consumerSecret: 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw',
        accessToken: '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb',
        accessSecret: 'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE',
      },
      nonce: 'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg',
      timestamp: 1318622958,
    });

    expect(header).toContain('oauth_signature="hCtSmYh%2BiHYCEqBWrE7C7hYmtUk%3D"');
    expect(header).toMatch(/^OAuth oauth_consumer_key="xvz1evFS4wEEPTGEFPHBog", /);
  });
});
