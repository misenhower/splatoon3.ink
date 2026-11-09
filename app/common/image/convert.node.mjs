import sharp from 'sharp';

// Node implementation of #image-converter. The package import keeps native sharp out of the
// Worker bundle; convert.worker.mjs is the Workers counterpart.

/**
 * @param {Uint8Array} png
 * @param {object} [options]
 * @param {number} [options.quality]
 * @returns {Promise<Uint8Array>} JPEG bytes
 */
export async function convertToJpeg(png, { quality = 80 } = {}) {
  return new Uint8Array(
    await sharp(png).flatten({ background: '#ffffff' }).jpeg({ quality }).toBuffer(),
  );
}
