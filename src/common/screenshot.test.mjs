import { describe, expect, it, vi } from 'vitest';
import { markScreenshotReady } from './screenshot.mjs';

describe('markScreenshotReady', () => {
  it('marks the page ready after fonts, images, and layout settle', async () => {
    let resolveFonts;
    let resolveImage;
    let fontsReady = new Promise(resolve => { resolveFonts = resolve; });
    let imageReady = new Promise(resolve => { resolveImage = resolve; });
    let setAttribute = vi.fn();
    let document = {
      documentElement: { setAttribute },
      fonts: { ready: fontsReady },
      images: [{ complete: true, decode: () => imageReady }],
    };
    let frames = [];
    let requestAnimationFrame = callback => frames.push(callback);

    let ready = markScreenshotReady({ document, requestAnimationFrame });
    await Promise.resolve();
    expect(setAttribute).not.toHaveBeenCalled();

    resolveFonts();
    await Promise.resolve();
    expect(setAttribute).not.toHaveBeenCalled();

    resolveImage();
    await Promise.resolve();
    await Promise.resolve();
    expect(frames).toHaveLength(1);
    expect(setAttribute).not.toHaveBeenCalled();

    frames.shift()();
    await Promise.resolve();
    expect(frames).toHaveLength(1);
    expect(setAttribute).not.toHaveBeenCalled();

    frames.shift()();
    await ready;

    expect(setAttribute).toHaveBeenCalledWith('data-screenshot-ready', 'true');
  });

  it('does not mark a readiness run that became stale while assets settled', async () => {
    let resolveImage;
    let imageReady = new Promise(resolve => { resolveImage = resolve; });
    let setAttribute = vi.fn();
    let document = {
      documentElement: { setAttribute },
      fonts: { ready: Promise.resolve() },
      images: [{ decode: () => imageReady }],
    };
    let isCurrent = true;
    let ready = markScreenshotReady({
      document,
      isCurrent: () => isCurrent,
      requestAnimationFrame: callback => callback(),
    });

    isCurrent = false;
    resolveImage();
    await ready;

    expect(setAttribute).not.toHaveBeenCalled();
  });
});
