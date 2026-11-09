import { env } from 'cloudflare:workers';

// Workers implementation of #image-converter, using the Images binding.

/**
 * @param {Uint8Array} png
 * @param {object} [options]
 * @param {number} [options.quality]
 * @param {object} [options.images] Images binding (defaults to env.IMAGES)
 * @returns {Promise<Uint8Array>} JPEG bytes
 */
export async function convertToJpeg(png, { quality = 80, images = env.IMAGES } = {}) {
  let result = await images
    .input(new Response(png).body)
    .transform({ background: '#ffffff' })
    .output({ format: 'image/jpeg', quality });

  return new Uint8Array(await result.response().arrayBuffer());
}
