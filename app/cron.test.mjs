import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  archiveData: vi.fn(),
  jobs: new Map(),
  sendStatuses: vi.fn(),
  updateFast: vi.fn(),
  updateSlow: vi.fn(),
}));

vi.mock('cron', () => ({
  CronJob: class {
    constructor(cronTime, onTick) {
      mocks.jobs.set(cronTime, onTick);
    }
  },
}));
vi.mock('./data/index.mjs', () => ({ updateFast: mocks.updateFast, updateSlow: mocks.updateSlow }));
vi.mock('./splatnet/index.mjs', () => ({ warmCaches: vi.fn() }));
vi.mock('./social/index.mjs', () => ({ sendStatuses: mocks.sendStatuses }));
vi.mock('./data/DataArchiver.mjs', () => ({ archiveData: mocks.archiveData }));
vi.mock('./social/updateAvatars.mjs', () => ({ updateAvatars: vi.fn() }));

async function loadJobs() {
  const { default: startCron } = await import('./cron.mjs');
  startCron();
}

describe('cron update coordination', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.jobs.clear();
    mocks.updateFast.mockReset();
    mocks.updateSlow.mockReset();
    mocks.sendStatuses.mockReset();
    mocks.archiveData.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('posts after the fast updaters and before the slow ones', async () => {
    const calls = [];
    mocks.updateFast.mockImplementation(async mode => calls.push(`fast:${mode}`));
    mocks.sendStatuses.mockImplementation(async () => calls.push('social'));
    mocks.updateSlow.mockImplementation(async mode => calls.push(`slow:${mode}`));
    mocks.archiveData.mockImplementation(async () => calls.push('archive'));
    await loadJobs();

    await mocks.jobs.get('20 * * * *')();

    expect(calls).toEqual(['fast:all', 'social', 'slow:all', 'archive']);
  });

  it('allows another update after an update rejects', async () => {
    mocks.updateFast.mockRejectedValueOnce(new Error('update failed'));
    await loadJobs();

    const update = mocks.jobs.get('15 0,1,2,3,4 * * * *');
    await expect(update()).rejects.toThrow('update failed');
    await update();

    expect(mocks.updateFast).toHaveBeenCalledTimes(2);
  });
});
