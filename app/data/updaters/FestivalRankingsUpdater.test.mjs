import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testBuckets } from '../../test/storage.mjs';
import RunLimits from '../RunLimits.mjs';

const { rankingUpdaters, failingFests } = vi.hoisted(() => ({
  rankingUpdaters: [],
  failingFests: new Set(),
}));
vi.mock('../../common/prefixedConsole.mjs', () => ({
  default: () => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock('./FestivalRankingUpdater.mjs', () => ({
  default: class {
    constructor(region, festID, endTime) {
      Object.assign(this, { region, festID, endTime });
      this.updateIfNeeded = vi.fn(async () => {
        if (failingFests.has(festID)) throw new Error('SplatNet failed');
      });
      rankingUpdaters.push(this);
    }
  },
}));

const { default: FestivalRankingsUpdater } = await import('./FestivalRankingsUpdater.mjs');

function publishFestivals(region, nodes) {
  return testBuckets().public.put('data/festivals.json', JSON.stringify({
    [region]: { data: { festRecords: { nodes } } },
  }));
}

describe('FestivalRankingsUpdater', () => {
  beforeEach(() => {
    rankingUpdaters.length = 0;
    failingFests.clear();
    vi.stubEnv('NINTENDO_TOKEN_US', 'token');
    vi.stubEnv('NINTENDO_TOKEN_EU', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('updates rankings only for published Splatfests with results', async () => {
    await publishFestivals('US', [
      { id: 'fest-1', endTime: '2026-10-01T00:00:00Z', teams: [{ result: { isWinner: true } }, {}] },
      { id: 'fest-2', endTime: '2026-11-20T00:00:00Z', teams: [{}, {}] },
    ]);

    await new FestivalRankingsUpdater('US').updateIfNeeded();

    expect(rankingUpdaters.map(u => [u.region, u.festID, u.endTime]))
      .toEqual([['US', 'fest-1', '2026-10-01T00:00:00Z']]);
    expect(rankingUpdaters[0].updateIfNeeded).toHaveBeenCalledOnce();
  });

  it('continues with other Splatfests when one ranking update fails', async () => {
    await publishFestivals('US', [
      { id: 'fest-1', teams: [{ result: {} }] },
      { id: 'fest-2', teams: [{ result: {} }] },
    ]);
    failingFests.add('fest-1');

    await expect(new FestivalRankingsUpdater('US').updateIfNeeded()).resolves.toBeUndefined();

    expect(rankingUpdaters.map(u => u.festID)).toEqual(['fest-1', 'fest-2']);
    expect(rankingUpdaters[1].updateIfNeeded).toHaveBeenCalledOnce();
  });

  it('stops starting rankings once the run is out of time', async () => {
    await publishFestivals('US', [
      { id: 'fest-1', teams: [{ result: {} }] },
      { id: 'fest-2', teams: [{ result: {} }] },
    ]);
    let limits = new RunLimits({ deadline: Date.now() + 60_000 });
    let updater = new FestivalRankingsUpdater('US');
    updater.limits = limits;
    failingFests.clear();

    // The first ranking uses up the time budget.
    let outOfTime = vi.spyOn(limits, 'outOfTime').mockReturnValueOnce(false).mockImplementation(() => {
      limits.incomplete = true;
      return true;
    });

    await updater.updateIfNeeded();

    expect(rankingUpdaters.map(u => u.festID)).toEqual(['fest-1']);
    expect(rankingUpdaters[0].limits).toBe(limits);
    expect(outOfTime).toHaveBeenCalledTimes(2);
    expect(limits.incomplete).toBe(true);
  });

  it('skips when rankings are disabled', async () => {
    await publishFestivals('US', [{ id: 'fest-1', teams: [{ result: {} }] }]);
    let updater = new FestivalRankingsUpdater('US');
    updater.settings = { disableFestivalRankings: true };

    await updater.updateIfNeeded();

    expect(rankingUpdaters).toHaveLength(0);
  });

  it('skips regions without a session token', async () => {
    await publishFestivals('EU', [{ id: 'fest-1', teams: [{ result: {} }] }]);

    await new FestivalRankingsUpdater('EU').updateIfNeeded();

    expect(rankingUpdaters).toHaveLength(0);
  });

  it('does nothing when festivals data has not been published yet', async () => {
    await new FestivalRankingsUpdater('US').updateIfNeeded();

    expect(rankingUpdaters).toHaveLength(0);
  });
});
