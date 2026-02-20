import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import prefixedConsole from '../common/prefixedConsole.mjs';
import ValueCache from '../common/ValueCache.mjs';
import { defaultClients } from './index.mjs';
import { getCurrentVariant } from './avatarVariants.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const avatarsDir = path.join(__dirname, 'avatars');

const console = prefixedConsole('Social', 'Avatar');

function cacheForClient(client) {
  return new ValueCache(`social.${client.key}.avatar`);
}

export async function updateAvatars() {
  let variant = getCurrentVariant();
  let avatarBuffer = null;

  for (let client of defaultClients()) {
    if (!client.updateProfile || !(await client.canSend())) {
      continue;
    }

    let cache = cacheForClient(client);
    let cachedVariant = await cache.getData();

    if (cachedVariant === variant.key) {
      continue;
    }

    console.log(`[${client.name}] Avatar update needed: ${cachedVariant || '(none)'} -> ${variant.key}`);

    // Read avatar file on first client that needs an update
    if (!avatarBuffer) {
      try {
        let avatarPath = path.join(avatarsDir, variant.avatar);
        avatarBuffer = await fs.readFile(avatarPath);
      } catch (error) {
        console.error(`Failed to read avatar file ${variant.avatar}:`, error.message);
        return;
      }
    }

    try {
      await client.updateProfile(avatarBuffer, variant.displayName);
      await cache.setData(variant.key);
      console.log(`[${client.name}] Profile updated successfully`);
    } catch (error) {
      console.error(`[${client.name}] Failed to update profile:`, error.message);
    }
  }
}
