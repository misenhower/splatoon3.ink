import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  archiveData: vi.fn(),
  jobs: new Map(),
  sendStatuses: vi.fn(),
  update: vi.fn(),
}));

vi.mock('cron', () => ({
  CronJob: class {
    constructor(cronTime, onTick) {
      mocks.jobs.set(cronTime, onTick);
    }
  },
}));
vi.mock('node:timers/promises', () => ({
  setTimeout: ms => new Promise(resolve => setTimeout(resolve, ms)),
}));
vi.mock('./data/index.mjs', () => ({ update: mocks.update }));
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
    mocks.update.mockReset();
    mocks.sendStatuses.mockReset();
    mocks.archiveData.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('allows another update after an update rejects', async () => {
    mocks.update.mockRejectedValueOnce(new Error('update failed'));
    await loadJobs();

    const update = mocks.jobs.get('15 0,1,2,3,4 * * * *');
    await expect(update()).rejects.toThrow('update failed');
    await update();

    expect(mocks.update).toHaveBeenCalledTimes(2);
  });

  it('restarts after a bounded wait when an update never settles', async () => {
    vi.useFakeTimers();
    mocks.update.mockReturnValue(new Promise(() => {}));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {});
    await loadJobs();

    const update = mocks.jobs.get('15 0,1,2,3,4 * * * *');
    const restart = mocks.jobs.get('0 55 4 * * *');
    update();
    const restarting = restart();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 - 1);

    expect(exit).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(warn).toHaveBeenCalledWith('[Cron] Update did not finish within 5 minutes; restarting anyway');
    expect(exit).toHaveBeenCalledWith(0);
    await restarting;
  });
});
