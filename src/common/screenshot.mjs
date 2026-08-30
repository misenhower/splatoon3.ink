export const screenshotReadyAttribute = 'data-screenshot-ready';
export const screenshotReadySelector = `[${screenshotReadyAttribute}="true"]`;
export const screenshotReadyTimeout = 30_000;

function nextFrame(requestAnimationFrame) {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

export async function markScreenshotReady({
  document = globalThis.document,
  isCurrent = () => true,
  requestAnimationFrame = globalThis.requestAnimationFrame,
} = {}) {
  await document.fonts?.ready;
  await Promise.allSettled(
    [...document.images].map(image => image.decode()),
  );
  await nextFrame(requestAnimationFrame);
  await nextFrame(requestAnimationFrame);

  if (isCurrent()) {
    document.documentElement.setAttribute(screenshotReadyAttribute, 'true');
  }
}
