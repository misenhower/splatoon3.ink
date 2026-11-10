import { describe, expect, it } from 'vitest';
import { formatSize, groupFiles, watchedFiles } from './data.js';
import { deliveryGrid, describeGroup, groupPosts } from './social.js';

const NOW = Date.UTC(2026, 10, 9, 14, 0, 0);
const MINUTE = 60_000;

describe('published data', () => {
  let files = [
    { key: 'data/schedules.json', size: 1200, uploaded: NOW - 2 * MINUTE },
    { key: 'data/coop.json', size: 800, uploaded: NOW - 45 * MINUTE },
    { key: 'data/locale/en-US.json', size: 90_000, uploaded: NOW - 10 * MINUTE },
    { key: 'data/xrank/xrank.tentatek.json', size: 2_400_000, uploaded: NOW - 30 * MINUTE },
    { key: 'data/festivals.ranking.US.JUEA-00001.json', size: 500, uploaded: NOW - 9000 * MINUTE },
    { key: 'data/festivals.US.ics', size: 300, uploaded: NOW - 5 * MINUTE },
  ];

  it('flags watched files that are old or missing', () => {
    expect(watchedFiles(files, NOW).map(file => [file.label, file.state])).toEqual([
      ['Schedules', 'fresh'],
      ['Gear', 'missing'],
      ['Co-op', 'stale'],
      ['Festivals', 'missing'],
    ]);
  });

  it('sorts files into sections, newest first, and searches by name', () => {
    expect(groupFiles(files).map(group => [group.key, group.files.map(file => file.name)])).toEqual([
      ['core', ['schedules.json', 'coop.json']],
      ['locale', ['locale/en-US.json']],
      ['xrank', ['xrank/xrank.tentatek.json']],
      ['rankings', ['festivals.ranking.US.JUEA-00001.json']],
      ['calendars', ['festivals.US.ics']],
    ]);
    expect(groupFiles(files)[0]).toMatchObject({ newest: NOW - 2 * MINUTE, size: 2000 });
    expect(groupFiles(files, 'XRANK').map(group => group.key)).toEqual(['xrank']);
  });

  it('formats sizes', () => {
    expect([formatSize(812), formatSize(14_200), formatSize(1_300_000)]).toEqual(['812 B', '14.2 kB', '1.3 MB']);
  });
});

describe('post log', () => {
  let schedules = { key: 'schedules', name: 'Schedules' };
  let gear = { key: 'gear.regular', name: 'Regular Gear' };
  let client = (key, name) => ({ key, name });

  // Newest first, as the API returns them.
  let posts = [
    { id: 'e', at: NOW + 3 * MINUTE, type: 'posted', generator: gear, client: client('bluesky', 'Bluesky'), manual: true },
    { id: 'd', at: NOW + 3000, type: 'error', generator: gear, client: client('bluesky', 'Bluesky'), runId: 'r1', error: 'HTTP 502' },
    { id: 'c', at: NOW + 2000, type: 'posted', generator: gear, client: client('mastodon', 'Mastodon'), runId: 'r1' },
    { id: 'b', at: NOW + 1000, type: 'posted', generator: schedules, client: client('bluesky', 'Bluesky'), runId: 'r1' },
    { id: 'a', at: NOW, type: 'posted', generator: schedules, client: client('mastodon', 'Mastodon'), runId: 'r1' },
  ];

  it('folds one status going to several accounts into one row', () => {
    let groups = groupPosts(posts);

    expect(groups.map(group => [describeGroup(group), group.type, group.manual])).toEqual([
      ['Regular Gear to Bluesky', 'posted', true],
      ['Regular Gear on Bluesky', 'error', false],
      ['Regular Gear to Mastodon', 'posted', false],
      ['Schedules to 2 accounts', 'posted', false],
    ]);
    expect(groups[3].clients.map(entry => entry.name)).toEqual(['Mastodon', 'Bluesky']);
    expect(groups[3].at).toBe(NOW + 1000);
  });

  it('describes a status that could not be generated', () => {
    expect(describeGroup(groupPosts([{ at: NOW, type: 'error', generator: schedules, client: null, error: 'Timed out' }])[0]))
      .toBe('Schedules could not be generated');
  });

  it('shows a failure only while it is the newest attempt', () => {
    let lastPosted = { mastodon: { 'gear.regular': { postedAt: NOW + 2000 } }, bluesky: { schedules: { postedAt: NOW + 1000 } } };

    // Before the retry by hand, Bluesky's gear post is failing.
    let failing = deliveryGrid(lastPosted, posts.slice(1));
    expect(failing.bluesky['gear.regular'].failure).toMatchObject({ error: 'HTTP 502' });
    expect(failing.mastodon['gear.regular']).toMatchObject({ postedAt: NOW + 2000, failure: null });

    // After it, the delivery marker is newer than the failure.
    let fixed = deliveryGrid({ ...lastPosted, bluesky: { ...lastPosted.bluesky, 'gear.regular': { postedAt: NOW + 3 * MINUTE } } }, posts);
    expect(fixed.bluesky['gear.regular']).toMatchObject({ postedAt: NOW + 3 * MINUTE, failure: null });
  });
});
