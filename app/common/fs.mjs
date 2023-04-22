import fs from 'fs/promises';

export async function exists(file) {
  try {
    await fs.access(file);

    return true;
  } catch (e) {
    return false;
  }
}
