import { fileURLToPath } from 'node:url';
import { defaultStatusGenerators } from './index.mjs';
import FileWriter from './clients/FileWriter.mjs';
import ScreenshotHelper from '../screenshots/ScreenshotHelper.mjs';
import { validateSocialPost } from './validateSocialPost.mjs';

export async function previewStatuses(locale = 'en-US', date, onlyGenerator) {
  if (!['en-US', 'ja-JP'].includes(locale)) throw new Error('Preview locale must be en-US or ja-JP');

  const now = date ? Date.parse(date) : null;
  if (date && !Number.isFinite(now)) throw new Error('Preview date must be an ISO date and time');

  const generators = defaultStatusGenerators({ locale, now });
  if (onlyGenerator && !generators.some(g => g.key === onlyGenerator)) {
    throw new Error(`Unknown generator: ${onlyGenerator}`);
  }

  const writer = new FileWriter({ dir: `temp/social-preview/${locale}` });
  let failed = false;
  let count = 0;

  for (const generator of generators) {
    if (onlyGenerator && generator.key !== onlyGenerator) continue;
    const screenshots = new ScreenshotHelper({ provider: 'local' });

    try {
      if (!await generator.shouldPost({ key: 'preview' })) continue;

      const status = await generator.getStatus(screenshots);
      validateSocialPost(status, locale);
      await writer.send(status, generator);
      console.log(`Preview: ${writer.dir}/${generator.key}`);
      count++;
    } catch (error) {
      console.error(`${generator.key}: ${error.message}`);
      failed = true;
    } finally {
      await screenshots.close();
    }
  }

  console.log(`Created ${count} previews. No posts sent or delivery markers written.`);
  if (failed) throw new Error('Some previews failed; see the errors above');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  previewStatuses(...process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
