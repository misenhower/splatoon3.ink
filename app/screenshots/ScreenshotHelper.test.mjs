import { afterEach, describe, expect, it, vi } from 'vitest';
import ScreenshotHelper from './ScreenshotHelper.mjs';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ScreenshotHelper', () => {
  it('captures a public screenshot through Cloudflare Browser Run', async () => {
    vi.stubEnv('SCREENSHOT_PROVIDER', 'cloudflare');
    vi.stubEnv('SITE_URL', 'https://splatoon3.ink');
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'account-id');
    vi.stubEnv('CLOUDFLARE_BROWSER_RUN_API_TOKEN', 'api-token');

    let png = new Uint8Array([137, 80, 78, 71]);
    let fetch = vi.fn().mockResolvedValue(new Response(png, {
      headers: { 'Content-Type': 'image/png' },
    }));
    let helper = new ScreenshotHelper({ fetch });
    helper.defaultParams = { time: 123 };

    let screenshot = await helper.capture('schedules', {
      params: { region: 'NA' },
      viewport: { width: 600 },
    });

    expect(screenshot).toEqual(Buffer.from(png));
    expect(fetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/account-id/browser-rendering/screenshot?cacheTTL=0',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer api-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://splatoon3.ink/screenshots/#schedules?time=123&region=NA',
          viewport: {
            width: 600,
            height: 675,
            deviceScaleFactor: 2,
          },
          gotoOptions: { waitUntil: 'networkidle0' },
          waitForTimeout: 1000,
          screenshotOptions: { type: 'png' },
        }),
      },
    );
  });

  it('surfaces a Cloudflare rate limit response without retrying', async () => {
    vi.stubEnv('SCREENSHOT_PROVIDER', 'cloudflare');
    vi.stubEnv('SITE_URL', 'https://splatoon3.ink');
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'account-id');
    vi.stubEnv('CLOUDFLARE_BROWSER_RUN_API_TOKEN', 'api-token');

    let fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      errors: [{ code: 2001, message: 'Rate limit exceeded' }],
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    }));
    let helper = new ScreenshotHelper({ fetch });

    await expect(helper.capture('schedules')).rejects.toThrow(
      'Cloudflare Browser Run screenshot failed (429): Rate limit exceeded',
    );
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('requires the Cloudflare configuration before opening', async () => {
    vi.stubEnv('SCREENSHOT_PROVIDER', 'cloudflare');
    vi.stubEnv('SITE_URL', '');
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', '');
    vi.stubEnv('CLOUDFLARE_BROWSER_RUN_API_TOKEN', '');

    let helper = new ScreenshotHelper;

    await expect(helper.open()).rejects.toThrow(
      'Missing Cloudflare screenshot configuration: SITE_URL, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_BROWSER_RUN_API_TOKEN',
    );
  });
});
