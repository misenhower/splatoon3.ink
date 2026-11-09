import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalAuth, auth, configureAuth, SPLATNET3_WEB_SERVICE_ID } from './auth.mjs';
import SplatNet3Client from './SplatNet3Client.mjs';

vi.mock('../common/prefixedConsole.mjs', () => ({
  default: () => ({ info: vi.fn(), debug: vi.fn() }),
}));

function fakeNsoClient() {
  return {
    region: 'US',
    cachePrefix: 'nso.test',
    getCoralSession: vi.fn().mockResolvedValue({}),
    getWebServiceToken: vi.fn().mockResolvedValue('web-token'),
  };
}

describe('auth', () => {
  afterEach(() => {
    configureAuth(null);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('refreshes every credential without using the caches', async () => {
    let nso = fakeNsoClient();
    let local = new LocalAuth;
    let bulletToken = vi.spyOn(local, 'bulletToken').mockResolvedValue({ bulletToken: 'b' });

    await local.refresh(nso);

    expect(nso.getCoralSession).toHaveBeenCalledWith(false);
    expect(nso.getWebServiceToken).toHaveBeenCalledWith(SPLATNET3_WEB_SERVICE_ID, false);
    expect(bulletToken).toHaveBeenCalledWith(nso, { useCache: false });
  });

  it('keeps refreshing later credentials when an earlier step fails', async () => {
    let nso = fakeNsoClient();
    nso.getCoralSession.mockRejectedValue(new Error('Coral unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let local = new LocalAuth;
    vi.spyOn(local, 'bulletToken').mockResolvedValue({ bulletToken: 'b' });

    await local.refresh(nso);

    expect(nso.getWebServiceToken).toHaveBeenCalled();
    expect(local.bulletToken).toHaveBeenCalled();
  });

  it('caches new bullet tokens in private storage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ bulletToken: 'fresh' })));

    let token = await new LocalAuth().bulletToken(fakeNsoClient(), { language: 'ja-JP' });

    expect(token).toEqual({ bulletToken: 'fresh' });
    expect(fetch.mock.calls[0][1].headers['Accept-Language']).toBe('ja-JP');
    expect(fetch.mock.calls[0][1].headers['X-Web-View-Ver']).toEqual(expect.any(String));
    expect(await new LocalAuth().bulletToken(fakeNsoClient())).toEqual({ bulletToken: 'fresh' });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('lets SplatNet clients use a configured provider', async () => {
    let provider = { bulletToken: vi.fn().mockResolvedValue({ bulletToken: 'remote' }), refresh: vi.fn() };
    configureAuth(provider);
    let nso = fakeNsoClient();

    let token = await new SplatNet3Client(nso, 'es-MX').getBulletToken(false);

    expect(auth()).toBe(provider);
    expect(token).toEqual({ bulletToken: 'remote' });
    expect(provider.bulletToken).toHaveBeenCalledWith(nso, { language: 'es-MX', useCache: false });
  });
});
