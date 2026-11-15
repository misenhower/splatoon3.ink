import { afterEach, describe, expect, it, vi } from 'vitest';
import FestivalUpdater from './FestivalUpdater.mjs';
import { storage } from '../../common/storage/index.mjs';
import { testBuckets } from '../../test/storage.mjs';
import RunLimits from '../RunLimits.mjs';

function makeUpdater(region) {
  return Object.assign(Object.create(FestivalUpdater.prototype), {
    selectedRegion: region,
    nsoClient: { region },
    filename: 'festivals',
    outputDirectory: 'data',
    archiveOnePerHour: true,
    limits: new RunLimits,
  });
}

describe('FestivalUpdater', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves every region into festivals.json, one write at a time', async () => {
    // Slow writes, as R2's are, so a region that did not wait would read the file before the
    // previous region's write landed.
    let writeText = storage().public.writeText.bind(storage().public);
    let writing = 0;
    let mostAtOnce = 0;

    vi.spyOn(storage().public, 'writeText').mockImplementation(async (...args) => {
      mostAtOnce = Math.max(mostAtOnce, ++writing);
      await new Promise(resolve => setTimeout(resolve, 10));
      await writeText(...args);
      writing--;
    });

    let regions = ['US', 'EU', 'JP', 'AP'];

    await Promise.all(regions.map(region => makeUpdater(region).saveData({ region })));

    expect(mostAtOnce).toBe(1);
    expect(testBuckets().public.json('data/festivals.json')).toEqual(
      Object.fromEntries(regions.map(region => [region, { region }])),
    );
  });
});
