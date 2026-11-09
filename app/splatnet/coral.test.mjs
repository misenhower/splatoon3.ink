import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClientAssertion, getRemoteConfig } from './coral.mjs';

function remoteConfig(overrides = {}) {
  return {
    require_version: ['1.6.1'],
    coral: { znca_version: '3.4.0' },
    coral_auth: { default: ['nxapi', 'https://znca.test/api'] },
    ...overrides,
  };
}

describe('coral', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('signs client assertions exactly like the previous node:crypto implementation', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-08T12:00:00Z'));

    let assertion = await createClientAssertion('client-id', 'shared-secret', 'https://issuer.test');
    let [header, payload, signature] = assertion.split('.');
    let expected = createHmac('sha256', 'shared-secret').update(`${header}.${payload}`).digest('base64url');

    expect(JSON.parse(Buffer.from(header, 'base64url'))).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(JSON.parse(Buffer.from(payload, 'base64url'))).toEqual({
      typ: 'client_assertion',
      iss: 'client-id',
      aud: 'https://issuer.test',
      exp: 1794139500,
      iat: 1794139200,
    });
    expect(signature).toBe(expected);
  });

  it('reads the znca version and f-generation provider from the remote config', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(remoteConfig(), {
      headers: { 'Cache-Control': 'max-age=600' },
    })));

    let config = await getRemoteConfig('test-agent');

    expect(config).toMatchObject({
      zncaVersion: '3.4.0',
      zncaApiUrl: 'https://znca.test/api',
      cacheControl: 'max-age=600',
    });
    expect(fetch.mock.calls[0][1].headers).toMatchObject({
      'User-Agent': 'test-agent',
      'X-nxapi-Version': '1.6.1',
    });
  });

  it.each([
    [{ coral: null }, 'prevents Coral authentication'],
    [{ require_version: ['2.0.0'] }, 'no longer supports protocol version'],
    [{ coral_auth: { default: ['imink', 'https://example.test'] } }, 'unsupported f-generation provider'],
  ])('refuses a remote config that does not allow this client (%o)', async (overrides, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(remoteConfig(overrides))));

    await expect(getRemoteConfig('test-agent')).rejects.toThrow(message);
  });
});
