import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ValueCache from '../common/ValueCache.mjs';
import ScreenshotHelper from '../screenshots/ScreenshotHelper.mjs';
import StatusGeneratorManager from './StatusGeneratorManager.mjs';
import { readSocialSettings, setClientEnabled } from './SocialSettings.mjs';
import { lastPosted, postStatus, previewStatus, setAccountEnabled, socialAccounts, socialGenerators } from './admin.mjs';
import BlueskyClient from './clients/BlueskyClient.mjs';
import MastodonClient from './clients/MastodonClient.mjs';
import SchedulesStatus from './generators/SchedulesStatus.mjs';
import StatusGenerator from './generators/StatusGenerator.mjs';

vi.mock('../common/prefixedConsole.mjs', () => ({
  default: () => ({ log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock('@sentry/core', () => ({ captureException: vi.fn() }));

const image = new Uint8Array([1, 2, 3]);

function credentials() {
  vi.stubEnv('MASTODON_URL', 'https://mastodon.test');
  vi.stubEnv('MASTODON_ACCESS_TOKEN', 'token');
  vi.stubEnv('BLUESKY_SERVICE', 'https://bsky.test');
  vi.stubEnv('BLUESKY_IDENTIFIER', 'en.test');
  vi.stubEnv('BLUESKY_PASSWORD', 'password');
  vi.stubEnv('BLUESKY_JP_SERVICE', 'https://bsky.test');
  vi.stubEnv('BLUESKY_JP_IDENTIFIER', 'jp.test');
  vi.stubEnv('BLUESKY_JP_PASSWORD', 'password');
}

// A status that renders without published data or a browser.
function fakeStatus(text = 'Rotation') {
  vi.spyOn(SchedulesStatus.prototype, 'getStatus').mockImplementation(async function () {
    return { status: text, locale: this.locale, media: [{ type: 'image/png', altText: 'Stages', file: image }] };
  });
  vi.spyOn(StatusGenerator.prototype, 'getDataTime').mockResolvedValue(1000);
  vi.spyOn(SchedulesStatus.prototype, 'getDataTime').mockResolvedValue(1000);
  vi.spyOn(ScreenshotHelper.prototype, 'open').mockResolvedValue();
  vi.spyOn(ScreenshotHelper.prototype, 'close').mockResolvedValue();
}

beforeEach(() => {
  for (let name of ['BUFFER_API_KEY', 'THREADS_USER_ID', 'MASTODON_URL', 'BLUESKY_SERVICE', 'BLUESKY_JP_SERVICE']) {
    vi.stubEnv(name, '');
  }
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('accounts', () => {
  it('lists every account with its credentials and posting switch, and no file writers', async () => {
    credentials();
    await setClientEnabled('mastodon', false);

    let accounts = await socialAccounts();

    expect(accounts.map(account => account.key)).toEqual(['twitter', 'mastodon', 'bluesky', 'threads', 'twitter.jp', 'bluesky.jp']);
    expect(accounts.find(account => account.key === 'mastodon')).toMatchObject({ configured: true, enabled: false, locale: 'en-US' });
    expect(accounts.find(account => account.key === 'mastodon').disabledAt).toEqual(expect.any(Number));
    expect(accounts.find(account => account.key === 'twitter')).toMatchObject({ configured: false, enabled: true });
    expect(accounts.find(account => account.key === 'bluesky.jp')).toMatchObject({ configured: true, locale: 'ja-JP' });
  });

  it('turns an account off and on again, and refuses unknown accounts', async () => {
    await setAccountEnabled('threads', false);
    expect(Object.keys((await readSocialSettings()).disabledClients)).toEqual(['threads']);

    await setAccountEnabled('threads', true);
    expect((await readSocialSettings()).disabledClients).toEqual({});

    await expect(setAccountEnabled('image', false)).rejects.toThrow('Unknown account: image');
  });

  it('gives a turned-off account no scheduled posts and leaves its delivery marker alone', async () => {
    credentials();
    fakeStatus();
    await setClientEnabled('mastodon', false);

    let mastodon = vi.spyOn(MastodonClient.prototype, 'send').mockResolvedValue();
    let bluesky = vi.spyOn(BlueskyClient.prototype, 'send').mockResolvedValue();
    let manager = new StatusGeneratorManager([new SchedulesStatus], [new MastodonClient, new BlueskyClient]);

    let events = await manager.sendStatuses();

    expect(mastodon).not.toHaveBeenCalled();
    expect(bluesky).toHaveBeenCalledOnce();
    expect(events.map(event => [event.type, event.generator.key, event.client.key])).toEqual([['posted', 'schedules', 'bluesky']]);
    expect(await new ValueCache('social.mastodon.schedules').getData()).toBeNull();
    expect(await new ValueCache('social.bluesky.schedules').getData()).toBe(1000);
  });
});

describe('post log events', () => {
  it('records a failed post with its error and keeps going', async () => {
    credentials();
    fakeStatus();
    vi.spyOn(MastodonClient.prototype, 'send').mockRejectedValue(new Error('HTTP 502'));
    vi.spyOn(BlueskyClient.prototype, 'send').mockResolvedValue();

    let manager = new StatusGeneratorManager([new SchedulesStatus], [new MastodonClient, new BlueskyClient]);
    let events = await manager.sendStatuses();

    expect(events.map(event => [event.type, event.client.key, event.error])).toEqual(expect.arrayContaining([
      ['error', 'mastodon', 'HTTP 502'],
      ['posted', 'bluesky', undefined],
    ]));
    expect(events).toHaveLength(2);
  });

  it('records a status that could not be generated', async () => {
    credentials();
    vi.spyOn(SchedulesStatus.prototype, 'shouldPost').mockResolvedValue(true);
    vi.spyOn(SchedulesStatus.prototype, 'getStatus').mockRejectedValue(new Error('Screenshot timed out'));
    vi.spyOn(ScreenshotHelper.prototype, 'open').mockResolvedValue();
    vi.spyOn(ScreenshotHelper.prototype, 'close').mockResolvedValue();

    let events = await new StatusGeneratorManager([new SchedulesStatus], [new BlueskyClient]).sendStatuses();

    expect(events).toEqual([expect.objectContaining({ type: 'error', client: null, error: 'Screenshot timed out', generator: { key: 'schedules', name: 'Schedules' } })]);
  });
});

describe('last posted', () => {
  it('reads when each status last went to each account', async () => {
    await new ValueCache('social.bluesky.schedules').setData(1000);
    await new ValueCache('social.bluesky.jp.gear.dailydrop').setData(2000);

    let posted = await lastPosted();

    expect(Object.keys(posted).sort()).toEqual(['bluesky', 'bluesky.jp']);
    expect(posted.bluesky.schedules.postedAt).toEqual(expect.any(Number));
    expect(Object.keys(posted['bluesky.jp'])).toEqual(['gear.dailydrop']);
  });

  it('lists the statuses in posting order', () => {
    expect(socialGenerators()[0]).toEqual({ key: 'schedules', name: 'Schedules' });
    expect(socialGenerators().map(generator => generator.key)).toContain('gear.dailydrop');
  });
});

describe('preview', () => {
  it('renders the status without sending or marking anything', async () => {
    credentials();
    fakeStatus('ローテーション');

    let send = vi.spyOn(BlueskyClient.prototype, 'send');
    let preview = await previewStatus('schedules', 'ja-JP');

    expect(preview).toEqual({ text: 'ローテーション', contentWrapper: null, media: [{ type: 'image/png', altText: 'Stages', file: image }] });
    expect(send).not.toHaveBeenCalled();
    expect(await lastPosted()).toEqual({});
  });

  it('refuses unknown statuses and statuses with nothing to say', async () => {
    await expect(previewStatus('nope')).rejects.toThrow('Unknown status: nope');

    fakeStatus(false);
    await expect(previewStatus('schedules')).rejects.toThrow('nothing to post');
  });
});

describe('posting by hand', () => {
  it('sends one status to the chosen accounts in their own language, even when not due', async () => {
    credentials();
    fakeStatus();
    await new ValueCache('social.bluesky.schedules').setData(1000); // already posted for this rotation

    let sent = [];
    vi.spyOn(BlueskyClient.prototype, 'send').mockImplementation(async function (status) {
      sent.push([this.key, status.locale]);
    });
    let mastodon = vi.spyOn(MastodonClient.prototype, 'send').mockResolvedValue();

    let events = await postStatus('schedules', ['bluesky', 'bluesky.jp']);

    expect(sent.sort()).toEqual([['bluesky', 'en-US'], ['bluesky.jp', 'ja-JP']]);
    expect(mastodon).not.toHaveBeenCalled();
    expect(events.map(event => [event.type, event.client.key]).sort()).toEqual([['posted', 'bluesky'], ['posted', 'bluesky.jp']]);
  });

  it('refuses a turned-off account instead of posting to it', async () => {
    credentials();
    fakeStatus();
    await setClientEnabled('bluesky', false);

    let send = vi.spyOn(BlueskyClient.prototype, 'send').mockResolvedValue();
    let events = await postStatus('schedules', ['bluesky']);

    expect(send).not.toHaveBeenCalled();
    expect(events).toEqual([expect.objectContaining({ type: 'error', client: { key: 'bluesky', name: 'Bluesky' }, error: 'Account is turned off or has no credentials' })]);
  });

  it('never posts a status that has no text', async () => {
    credentials();
    fakeStatus(false);

    let send = vi.spyOn(BlueskyClient.prototype, 'send').mockResolvedValue();
    let events = await postStatus('schedules', ['bluesky']);

    expect(send).not.toHaveBeenCalled();
    expect(events).toEqual([expect.objectContaining({ type: 'error', client: null, error: 'There is nothing to post for this status right now' })]);
  });

  it('refuses unknown accounts and file writers before doing anything', async () => {
    credentials();
    fakeStatus();

    let send = vi.spyOn(BlueskyClient.prototype, 'send').mockResolvedValue();

    await expect(postStatus('schedules', ['bluesky', 'image'])).rejects.toThrow('Unknown account: image');
    await expect(postStatus('schedules', [])).rejects.toThrow('Choose at least one account');
    expect(send).not.toHaveBeenCalled();
  });
});
