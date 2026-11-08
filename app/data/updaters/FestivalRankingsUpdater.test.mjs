import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { readFile, rankingUpdaters, failingFests } = vi.hoisted(() => ({
  readFile: vi.fn(),
  rankingUpdaters: [],
  failingFests: new Set(),
}));

vi.mock('fs/promises', () => ({ default: { readFile } }));
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

function festivals(region, nodes) {
  return JSON.stringify({ [region]: { data: { festRecords: { nodes } } } });
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
    readFile.mockReset();
  });

  it('updates rankings only for published Splatfests with results', async () => {
    readFile.mockResolvedValue(festivals('US', [
      { id: 'fest-1', endTime: '2026-10-01T00:00:00Z', teams: [{ result: { isWinner: true } }, {}] },
      { id: 'fest-2', endTime: '2026-11-20T00:00:00Z', teams: [{}, {}] },
    ]));

    await new FestivalRankingsUpdater('US').updateIfNeeded();

    expect(rankingUpdaters.map(u => [u.region, u.festID, u.endTime]))
      .toEqual([['US', 'fest-1', '2026-10-01T00:00:00Z']]);
    expect(rankingUpdaters[0].updateIfNeeded).toHaveBeenCalledOnce();
  });

  it('continues with other Splatfests when one ranking update fails', async () => {
    readFile.mockResolvedValue(festivals('US', [
      { id: 'fest-1', teams: [{ result: {} }] },
      { id: 'fest-2', teams: [{ result: {} }] },
    ]));
    failingFests.add('fest-1');

    await expect(new FestivalRankingsUpdater('US').updateIfNeeded()).resolves.toBeUndefined();

    expect(rankingUpdaters.map(u => u.festID)).toEqual(['fest-1', 'fest-2']);
    expect(rankingUpdaters[1].updateIfNeeded).toHaveBeenCalledOnce();
  });

  it('skips when rankings are disabled', async () => {
    let updater = new FestivalRankingsUpdater('US');
    updater.settings = { disableFestivalRankings: true };

    await updater.updateIfNeeded();

    expect(readFile).not.toHaveBeenCalled();
  });

  it('skips regions without a session token', async () => {
    await new FestivalRankingsUpdater('EU').updateIfNeeded();

    expect(readFile).not.toHaveBeenCalled();
  });

  it('does nothing when festivals data has not been published yet', async () => {
    readFile.mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }));

    await new FestivalRankingsUpdater('US').updateIfNeeded();

    expect(rankingUpdaters).toHaveLength(0);
  });
});
