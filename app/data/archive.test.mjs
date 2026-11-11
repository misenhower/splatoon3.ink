import { afterEach, describe, expect, it, vi } from 'vitest';
import { archiveSnapshot, flushArchive } from './archive.mjs';
import RunLimits from './RunLimits.mjs';
import { storage } from '../common/storage/index.mjs';
import { testBuckets } from '../test/storage.mjs';

vi.mock('@sentry/core', () => ({ captureException: vi.fn() }));

const snapshot = name => ({ key: `2026-11-08.12-00-00.${name}.json`, text: `{"${name}":1}`, name });

describe('archive', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes a snapshot and reports failures as warnings', async () => {
    let warn = vi.fn();

    expect(await archiveSnapshot(snapshot('gear'), { warn })).toBe(true);
    expect(testBuckets().archive.text('2026-11-08.12-00-00.gear.json')).toBe('{"gear":1}');

    vi.spyOn(storage().archive, 'writeText').mockRejectedValue(new Error('Archive upload failed with HTTP 503'));

    expect(await archiveSnapshot(snapshot('coop'), { warn })).toBe(false);
    expect(warn).toHaveBeenCalledWith('Could not archive coop:', expect.objectContaining({ message: 'Archive upload failed with HTTP 503' }));
  });

  it('writes only the newest copy of a snapshot saved more than once', async () => {
    let limits = new RunLimits({ deferArchive: true });
    let festivals = text => ({ key: '2026-11-08.12-00-00.festivals.json', text, name: 'festivals' });
    for (let held of [festivals('{"US":1}'), snapshot('gear'), festivals('{"US":1,"EU":1}')]) {
      limits.heldSnapshots.set(held.key, held);
    }

    expect(await flushArchive(limits)).toEqual({ archived: 2, failed: 0 });
    expect(testBuckets().archive.text('2026-11-08.12-00-00.festivals.json')).toBe('{"US":1,"EU":1}');
  });

  it('flushes held snapshots once, counting the ones that failed', async () => {
    let limits = new RunLimits({ deferArchive: true });
    for (let held of [snapshot('gear'), snapshot('coop'), snapshot('schedules')]) {
      limits.heldSnapshots.set(held.key, held);
    }

    let write = storage().archive.writeText.bind(storage().archive);
    vi.spyOn(storage().archive, 'writeText').mockImplementation((key, text) =>
      key.includes('coop') ? Promise.reject(new Error('slow down')) : write(key, text));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await flushArchive(limits)).toEqual({ archived: 2, failed: 1 });
    expect([...testBuckets().archive.objects.keys()].sort()).toEqual([
      '2026-11-08.12-00-00.gear.json',
      '2026-11-08.12-00-00.schedules.json',
    ]);
    expect(limits.heldSnapshots.size).toBe(0);
    expect(await flushArchive(limits)).toEqual({ archived: 0, failed: 0 });
  });
});
