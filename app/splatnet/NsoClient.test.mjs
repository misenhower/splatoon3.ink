import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testBuckets } from '../test/storage.mjs';

const coral = vi.hoisted(() => ({
  getRemoteConfig: vi.fn(),
  loginWithSessionToken: vi.fn(),
  getWebServiceToken: vi.fn(),
  ZncaApiClient: vi.fn(function (options) {
    Object.assign(this, options);
  }),
}));

vi.mock('./coral.mjs', () => coral);
vi.mock('../common/prefixedConsole.mjs', () => ({
  default: () => ({ info: vi.fn(), debug: vi.fn() }),
}));

const { default: NsoClient, getZnca } = await import('./NsoClient.mjs');

const session = {
  user: { id: 'na-user' },
  coralUserId: 1234,
  credential: { accessToken: 'coral-token', expiresIn: 7200 },
};

describe('NsoClient', () => {
  beforeEach(() => {
    vi.stubEnv('NINTENDO_TOKEN_US', 'session-token-us-12345678');
    vi.stubEnv('NXAPI_CLIENT_ID', 'client');
    vi.stubEnv('NXAPI_SHARED_SECRET', 'secret');
    vi.stubEnv('USER_AGENT', 'test-agent');
    coral.getRemoteConfig.mockResolvedValue({
      zncaVersion: '3.4.0',
      zncaApiUrl: 'https://znca.test/api/',
      cacheControl: 'public, max-age=1800',
    });
    coral.loginWithSessionToken.mockResolvedValue(session);
    coral.getWebServiceToken.mockResolvedValue({ accessToken: 'web-token', expiresIn: 7200 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('caches the nxapi remote config in private storage', async () => {
    let first = await getZnca('nso.a');
    let second = await getZnca('nso.a');
    let otherAccount = await getZnca('nso.b');

    expect(coral.getRemoteConfig).toHaveBeenCalledOnce();
    expect(coral.getRemoteConfig).toHaveBeenCalledWith('splatoon3.ink test-agent');
    expect(first.zncaVersion).toBe('3.4.0');
    expect(second.znca).toBe(first.znca);
    // znca-api tokens become bound to one Nintendo account
    expect(otherAccount.znca).not.toBe(first.znca);

    let cached = testBuckets().private.json('cache/nxapi.config.json');
    expect(cached.data.zncaApiUrl).toBe('https://znca.test/api/');
    expect(cached.expires - Date.now()).toBeGreaterThan(29 * 60 * 1000);
    expect(cached.expires - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000);
  });

  it('does not cache a remote config that disables Coral authentication', async () => {
    coral.getRemoteConfig.mockRejectedValue(new Error('Remote configuration prevents Coral authentication'));

    await expect(getZnca('nso.a')).rejects.toThrow('prevents Coral authentication');
    expect(testBuckets().private.objects.size).toBe(0);
  });

  it('requires nxapi client credentials', async () => {
    vi.stubEnv('NXAPI_SHARED_SECRET', '');

    await expect(getZnca('nso.a')).rejects.toThrow('NXAPI_CLIENT_ID and NXAPI_SHARED_SECRET');
  });

  it('logs in once and reuses the cached Coral session', async () => {
    let nso = NsoClient.make('US');

    expect(await nso.getCoralSession()).toEqual(session);
    expect(await nso.getCoralSession()).toEqual(session);

    expect(coral.loginWithSessionToken).toHaveBeenCalledOnce();
    expect(coral.loginWithSessionToken.mock.calls[0][0]).toBe('session-token-us-12345678');
    expect(testBuckets().private.json('cache/nso.12345678.coral.json').data).toEqual(session);
  });

  it('logs in again instead of using a session cached by the nxapi package', async () => {
    await testBuckets().private.put('cache/nso.12345678.coral.json', JSON.stringify({
      expires: Date.now() + 3600_000,
      data: { nintendoAccountToken: {}, nsoAccount: {}, credential: { accessToken: 'old' } },
    }));

    expect(await NsoClient.make('US').getCoralSession()).toEqual(session);
    expect(coral.loginWithSessionToken).toHaveBeenCalledOnce();
  });

  it('creates and caches web service tokens from the Coral session', async () => {
    let nso = NsoClient.make('US');

    expect(await nso.getWebServiceToken('4834290508791808')).toBe('web-token');
    expect(await nso.getWebServiceToken('4834290508791808')).toBe('web-token');

    expect(coral.getWebServiceToken).toHaveBeenCalledOnce();
    expect(coral.getWebServiceToken.mock.calls[0]).toEqual(['4834290508791808', expect.objectContaining({
      zncaVersion: '3.4.0',
      coralAccessToken: 'coral-token',
      coralUserId: 1234,
      naId: 'na-user',
    })]);
    expect(testBuckets().private.json('cache/nso.12345678.webservicetoken.4834290508791808.json').data)
      .toEqual({ accessToken: 'web-token', expiresIn: 7200 });
  });

  it('bypasses the caches when asked', async () => {
    let nso = NsoClient.make('US');
    await nso.getWebServiceToken('1');

    await nso.getCoralSession(false);
    await nso.getWebServiceToken('1', false);

    expect(coral.loginWithSessionToken).toHaveBeenCalledTimes(2);
    expect(coral.getWebServiceToken).toHaveBeenCalledTimes(2);
  });
});
