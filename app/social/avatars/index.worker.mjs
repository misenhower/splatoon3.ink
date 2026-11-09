// Workers implementation of #avatars. Wrangler bundles the PNGs as Data modules
// (see the "rules" in the updater's wrangler config).
import defaultAvatar from './default.png';
import halloweenAvatar from './halloween.png';
import prideAvatar from './pride.png';

const avatars = {
  'default.png': defaultAvatar,
  'halloween.png': halloweenAvatar,
  'pride.png': prideAvatar,
};

/**
 * @param {string} filename An avatar file in this directory, such as default.png
 * @returns {Promise<Uint8Array>} The PNG bytes
 */
export async function readAvatar(filename) {
  if (!avatars[filename]) {
    throw new Error(`Unknown avatar: ${filename}`);
  }

  return new Uint8Array(avatars[filename]);
}
