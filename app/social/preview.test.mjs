import { afterEach, describe, expect, it, vi } from 'vitest';
import { previewStatuses } from './preview.mjs';
import { defaultStatusGenerators } from './index.mjs';
import FileWriter from './clients/FileWriter.mjs';

vi.mock('./index.mjs', () => ({ defaultStatusGenerators: vi.fn() }));
vi.mock('./clients/FileWriter.mjs', () => ({
  default: vi.fn(class {
    constructor({ dir }) {
      this.dir = dir;
    }

    send = vi.fn();
  }),
}));
vi.mock('../screenshots/ScreenshotHelper.mjs', () => ({
  default: class {
    close = vi.fn();
  },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('local social previews', () => {
  it('writes only preview files and never updates delivery markers', async () => {
    const generator = {
      key: 'schedules',
      shouldPost: vi.fn().mockResolvedValue(true),
      getStatus: vi.fn().mockResolvedValue({ locale: 'ja-JP', status: 'ステージ情報', media: [] }),
      updatelastPostCache: vi.fn(),
    };
    defaultStatusGenerators.mockReturnValue([generator]);

    await previewStatuses('ja-JP', '2026-10-17T16:00:00Z');

    expect(defaultStatusGenerators).toHaveBeenCalledWith({ locale: 'ja-JP', now: 1792252800000 });
    expect(FileWriter).toHaveBeenCalledWith({ dir: 'temp/social-preview/ja-JP' });
    expect(FileWriter.mock.results[0].value.send).toHaveBeenCalledOnce();
    expect(generator.updatelastPostCache).not.toHaveBeenCalled();
  });

  it('reports a failed preview without changing delivery state', async () => {
    const generator = {
      key: 'schedules',
      shouldPost: vi.fn().mockResolvedValue(true),
      getStatus: vi.fn().mockRejectedValue(new Error('Missing translation')),
      updatelastPostCache: vi.fn(),
    };
    defaultStatusGenerators.mockReturnValue([generator]);

    await expect(previewStatuses('ja-JP')).rejects.toThrow('Some previews failed');
    expect(generator.updatelastPostCache).not.toHaveBeenCalled();
    expect(FileWriter.mock.results[0].value.send).not.toHaveBeenCalled();
  });

  it('rejects invalid input before loading generators', async () => {
    await expect(previewStatuses('../../private')).rejects.toThrow('locale');
    await expect(previewStatuses('ja-JP', 'not-a-date')).rejects.toThrow('ISO');
    expect(defaultStatusGenerators).not.toHaveBeenCalled();
  });
});
