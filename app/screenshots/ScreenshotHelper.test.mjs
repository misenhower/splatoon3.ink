import { afterEach, describe, expect, it, vi } from 'vitest';
import ScreenshotHelper from './ScreenshotHelper.mjs';
import screenshotWorker from '../../workers/screenshots/index.mjs';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ScreenshotHelper', () => {
  it('launches local Chrome and captures the built site on loopback', async () => {
    let { helper, png, page, browser, puppeteerClient, httpServer } = localFixture();

    let screenshot = await helper.capture('schedules', {
      viewport: { height: 400 },
    });
    await helper.close();

    expect(screenshot).toEqual(png);
    expect(puppeteerClient.launch).toHaveBeenCalledWith({
      executablePath: '/test/chrome',
      headless: true,
    });
    expect(page.setViewport).toHaveBeenCalledWith({
      width: 1200,
      height: 400,
      deviceScaleFactor: 2,
    });
    expect(page.goto.mock.calls).toEqual([
      ['about:blank'],
      ['http://127.0.0.1:4321/screenshots/#schedules', { waitUntil: 'load' }],
    ]);
    expect(page.waitForFunction).toHaveBeenCalledWith(expect.any(Function), { timeout: 30_000 });
    expect(httpServer.close).toHaveBeenCalledOnce();
    expect(browser.close).toHaveBeenCalledOnce();
  });

  it('serves the local build even when SITE_URL points at the public site', async () => {
    let { helper, page, httpServer } = localFixture({ SITE_URL: 'https://splatoon3.ink' });

    await helper.capture('gear/regular');
    await helper.close();

    expect(httpServer.open).toHaveBeenCalledOnce();
    expect(page.goto.mock.calls.at(-1)[0]).toBe('http://127.0.0.1:4321/screenshots/#gear/regular');
  });

  it('rejects when the screenshot page reports an error', async () => {
    let { helper, page } = localFixture();
    page.evaluate.mockResolvedValue('Missing translations: festivals.JUEA-00001');

    await expect(helper.capture('splatfest')).rejects.toThrow('Missing translations');
    await helper.close();

    expect(page.screenshot).not.toHaveBeenCalled();
  });

  it('cleans up the local server if Chrome fails to launch', async () => {
    let { helper, puppeteerClient, httpServer } = localFixture();
    puppeteerClient.launch.mockRejectedValue(new Error('Chrome unavailable'));

    await expect(helper.open()).rejects.toThrow('Chrome unavailable');
    await helper.close();

    expect(httpServer.close).toHaveBeenCalledOnce();
    expect(helper.isOpen).toBe(false);
  });

  it('cleans up Chrome and the local server if page setup fails', async () => {
    let { helper, browser, httpServer } = localFixture();
    browser.newPage.mockRejectedValue(new Error('Cannot open page'));

    await expect(helper.open()).rejects.toThrow('Cannot open page');
    await helper.close();

    expect(browser.close).toHaveBeenCalledOnce();
    expect(httpServer.close).toHaveBeenCalledOnce();
  });

  it('rejects a failed page load instead of capturing an error page', async () => {
    let { helper, page } = localFixture();
    page.goto.mockResolvedValue({ ok: () => false, status: () => 404 });

    await expect(helper.capture('schedules')).rejects.toThrow('Screenshot page failed (404)');
    await helper.close();

    expect(page.screenshot).not.toHaveBeenCalled();
  });

  it('captures through the Browser binding with the timeout workaround', async () => {
    let png = new Uint8Array([137, 80, 78, 71]);
    let browser = {
      quickAction: vi.fn().mockResolvedValue(new Response(png)),
    };
    let helper = cloudflareHelper(browser);
    helper.defaultParams = { time: 123 };

    let screenshot = await helper.capture('schedules', {
      params: { region: 'NA' },
      viewport: { width: 600 },
    });
    await helper.close();

    expect(screenshot).toEqual(png);
    expect(browser.quickAction).toHaveBeenCalledExactlyOnceWith('screenshot', {
      url: 'https://dev.splatoon3.ink/screenshots/index.html#schedules?time=123&region=NA',
      viewport: {
        width: 600,
        height: 675,
        deviceScaleFactor: 2,
      },
      cacheTTL: 0,
      gotoOptions: { waitUntil: 'domcontentloaded', timeout: 10_000 },
      waitForSelector: {
        selector: '[data-screenshot-ready="true"]',
        timeout: 10_000,
      },
      actionTimeout: 10_000,
      setExtraHTTPHeaders: { 'Cache-Control': 'no-cache' },
      screenshotOptions: { type: 'png' },
    });
  });

  it.each([
    [408, 'Request timeout'],
    [422, 'Navigation timed out'],
    [503, 'Browser unavailable'],
  ])('retries a transient %i response and returns the successful capture', async (status, message) => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    let png = new Uint8Array([137, 80, 78, 71]);
    let browser = {
      quickAction: vi.fn()
        .mockResolvedValueOnce(errorResponse(status, message))
        .mockResolvedValueOnce(new Response(png)),
    };
    let capture = cloudflareHelper(browser).capture('schedules');
    let assertion = expect(capture).resolves.toEqual(png);

    await vi.runAllTimersAsync();
    await assertion;

    expect(browser.quickAction).toHaveBeenCalledTimes(2);
  });

  it('stops after three retries with 0.5, 1, and 2 second backoff', async () => {
    vi.useFakeTimers();
    let warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let browser = {
      quickAction: vi.fn().mockImplementation(async () => errorResponse(422, 'Action timeout')),
    };
    let capture = cloudflareHelper(browser).capture('schedules');
    let assertion = expect(capture).rejects.toThrow('Action timeout');

    await vi.runAllTimersAsync();
    await assertion;

    expect(browser.quickAction).toHaveBeenCalledTimes(4);
    expect(warn.mock.calls.map(([, details]) => details.delayMs)).toEqual([500, 1000, 2000]);
  });

  it.each(['TypeError', 'TimeoutError'])('retries a thrown %s', async name => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    let error = new Error('Temporary browser failure');
    error.name = name;

    let png = new Uint8Array([137, 80, 78, 71]);
    let browser = {
      quickAction: vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(new Response(png)),
    };
    let assertion = expect(cloudflareHelper(browser).capture('schedules')).resolves.toEqual(png);

    await vi.runAllTimersAsync();
    await assertion;

    expect(browser.quickAction).toHaveBeenCalledTimes(2);
  });

  it.each([
    [401, 'Unauthorized'],
    [403, 'Forbidden'],
    [422, 'Invalid screenshot options'],
    [429, 'Rate limit exceeded'],
  ])('does not retry a permanent %i response', async (status, message) => {
    let browser = {
      quickAction: vi.fn().mockResolvedValue(errorResponse(status, message)),
    };

    await expect(cloudflareHelper(browser).capture('schedules')).rejects.toThrow(message);
    expect(browser.quickAction).toHaveBeenCalledOnce();
  });

  it('requires a Browser binding instead of REST credentials', async () => {
    await expect(cloudflareHelper().open()).rejects.toThrow('require a BROWSER binding');
  });

  it('requires the rendering site URL', async () => {
    vi.stubEnv('SCREENSHOT_PROVIDER', 'cloudflare');

    let helper = new ScreenshotHelper({ browser: { quickAction: vi.fn() }, env: {} });

    await expect(helper.open()).rejects.toThrow('Missing Cloudflare screenshot configuration: SITE_URL');
  });

  it('serves a capture from the preview Worker without running the social pipeline', async () => {
    let png = new Uint8Array([137, 80, 78, 71]);
    let browser = { quickAction: vi.fn().mockResolvedValue(new Response(png)) };
    let request = new Request('http://localhost:8789/?route=schedules%3Ftime%3D123');
    let response = await screenshotWorker.fetch(request, {
      BROWSER: browser,
      SITE_URL: 'https://dev.splatoon3.ink',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(png);
    expect(browser.quickAction.mock.calls[0][1].url)
      .toBe('https://dev.splatoon3.ink/screenshots/index.html#schedules?time=123');
  });

  it('requires an explicitly supported screenshot provider', async () => {
    vi.stubEnv('SCREENSHOT_PROVIDER', 'auto');

    let helper = new ScreenshotHelper;

    await expect(helper.open()).rejects.toThrow(
      'SCREENSHOT_PROVIDER must be "cloudflare" or "local"',
    );
  });
});

function cloudflareHelper(browser) {
  vi.stubEnv('SCREENSHOT_PROVIDER', 'cloudflare');

  return new ScreenshotHelper({
    browser,
    env: { SITE_URL: 'https://dev.splatoon3.ink' },
  });
}

function errorResponse(status, message) {
  return new Response(JSON.stringify({ errors: [{ message }] }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function localFixture(env = {}) {
  vi.stubEnv('SCREENSHOT_PROVIDER', 'local');

  let png = new Uint8Array([137, 80, 78, 71]);
  let page = {
    setViewport: vi.fn(),
    goto: vi.fn().mockResolvedValue({ ok: () => true }),
    waitForFunction: vi.fn(),
    evaluate: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(png),
  };
  let browser = {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn(),
  };
  let puppeteerClient = {
    launch: vi.fn().mockResolvedValue(browser),
  };
  let httpServer = {
    port: 4321,
    open: vi.fn(),
    close: vi.fn(),
  };
  let helper = new ScreenshotHelper({
    env: { CHROME_PATH: '/test/chrome', ...env },
    httpServerFactory: () => httpServer,
    puppeteerClient,
  });

  return { helper, png, page, browser, puppeteerClient, httpServer };
}
