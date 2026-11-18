import { describe, expect, it, vi } from 'vitest';
import StatusGenerator from './StatusGenerator.mjs';

function generatorWithCache(cache) {
  const generator = new StatusGenerator;
  generator.saveRetryDelayMs = 0;
  vi.spyOn(generator, 'getDataTime').mockResolvedValue(1000);
  vi.spyOn(generator, 'lastPostCache').mockReturnValue(cache);

  return generator;
}

describe('StatusGenerator', () => {
  it('does not treat an unreadable last post time as never posted', async () => {
    const generator = generatorWithCache({ getData: vi.fn().mockRejectedValue(new Error('internal error')) });

    await expect(generator.shouldPost({ key: 'bluesky' })).rejects.toThrow('internal error');
    expect(generator.lastPostCache().getData).toHaveBeenCalledWith({ strict: true });
  });

  it('tries saving the post time again when a write fails', async () => {
    const setData = vi.fn()
      .mockRejectedValueOnce(new Error('internal error'))
      .mockRejectedValueOnce(new Error('internal error'))
      .mockResolvedValue();
    const generator = generatorWithCache({ setData });

    await generator.updatelastPostCache({ key: 'bluesky' });

    expect(setData).toHaveBeenCalledTimes(3);
    expect(setData).toHaveBeenLastCalledWith(1000);
  });

  it('gives up saving the post time after four failed writes', async () => {
    const setData = vi.fn().mockRejectedValue(new Error('internal error'));
    const generator = generatorWithCache({ setData });

    await expect(generator.updatelastPostCache({ key: 'bluesky' })).rejects.toThrow('internal error');
    expect(setData).toHaveBeenCalledTimes(4);
  });
});
