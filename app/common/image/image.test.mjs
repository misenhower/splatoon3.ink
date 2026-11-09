import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { convertToJpeg } from '#image-converter';
import { pngSize } from './png.mjs';

async function png(width, height) {
  return new Uint8Array(await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).png().toBuffer());
}

describe('images', () => {
  it('reads PNG dimensions', async () => {
    expect(pngSize(await png(12, 7))).toEqual({ width: 12, height: 7 });
    expect(pngSize(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it('converts PNGs to JPEG on a white background in Node', async () => {
    let jpeg = await convertToJpeg(await png(4, 3));
    let { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true });

    expect(jpeg).toBeInstanceOf(Uint8Array);
    expect([jpeg[0], jpeg[1]]).toEqual([0xff, 0xd8]);
    expect(info).toMatchObject({ width: 4, height: 3 });
    expect(data[0]).toBeGreaterThan(240);
  });
});
