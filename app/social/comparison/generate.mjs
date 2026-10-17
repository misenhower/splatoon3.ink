import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPinia } from 'pinia';
import { defaultStatusGenerators } from '../index.mjs';
import ScreenshotHelper from '../../screenshots/ScreenshotHelper.mjs';
import { useSchedulesDataStore, useFestivalsDataStore, useGearDataStore, useCoopDataStore } from '../../../src/stores/data.mjs';
import { useTimeStore } from '../../../src/stores/time.mjs';
import { examples, createExample } from './examples.mjs';
import { translate } from './translate.mjs';
import { renderComparison } from './render.mjs';

export function exampleGenerator(example, locale) {
  const generator = defaultStatusGenerators({
    locale,
    now: example.time,
    translations: example.translations[locale],
  }).find(generator => generator.key === example.key);

  // Supply the same fixed data to the post generator and the browser.
  generator.preparePinia = async () => {
    if (generator.pinia) return;

    const pinia = createPinia();
    useTimeStore(pinia).setNow(example.time);
    useSchedulesDataStore(pinia).setData(structuredClone(example.data.schedules));
    useFestivalsDataStore(pinia).setData(structuredClone(example.data.festivals));
    useGearDataStore(pinia).setData(structuredClone(example.data.gear));
    useCoopDataStore(pinia).setData(structuredClone(example.data.coop));
    generator.pinia = pinia;
  };

  return generator;
}

export function exampleResponses(example) {
  return Object.fromEntries([
    ...Object.entries(example.data).map(([name, data]) => [`/data/${name}.json`, data]),
    ...Object.entries(example.translations).map(([locale, data]) => [`/data/locale/${locale}.json`, data]),
  ]);
}

export async function generateComparison(outputDirectory = 'temp/social-preview/comparison') {
  await fs.access('dist/screenshots/index.html').catch(() => {
    throw new Error('Build the screenshot app first: npm run build');
  });
  await fs.mkdir(outputDirectory, { recursive: true });

  const screenshots = new ScreenshotHelper({ provider: 'local' });
  const output = [];
  let responses = {};

  try {
    await screenshots.open();
    const page = screenshots._driver.page;
    await page.setRequestInterception(true);
    page.on('request', request => {
      const replacement = responses[new URL(request.url()).pathname];

      if (replacement) {
        void request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(replacement),
        });
      } else {
        void request.continue();
      }
    });

    for (const entry of examples) {
      const example = createExample(entry);
      responses = exampleResponses(example);
      const record = { id: entry.id, title: entry.title, locales: {} };

      for (const locale of ['en-US', 'ja-JP']) {
        // A fresh document resets the screenshot app's fixed locale between captures.
        await page.goto('about:blank');
        const generator = exampleGenerator(example, locale);
        const status = await generator.getStatus(screenshots);
        const missingImages = await page.$$eval('img', images => images
          .filter(image => image.currentSrc && !image.naturalWidth)
          .map(image => image.currentSrc));

        if (missingImages.length) {
          throw new Error(`Missing images for ${entry.id}: ${missingImages.join(', ')}`);
        }

        const image = `${entry.id}.${locale}.png`;
        await fs.writeFile(path.join(outputDirectory, image), status.media[0].file);
        record.locales[locale] = {
          body: status.status,
          alt: status.media[0].altText || '',
          screenshotText: await page.$eval('main', element => element.innerText),
          image,
        };
        console.log(`Captured ${entry.id} (${locale})`);
      }

      record.translated = Object.fromEntries(['body', 'alt', 'screenshotText'].map(field => [
        field, translate(record.locales['ja-JP'][field], entry),
      ]));
      output.push(record);
    }

    await fs.writeFile(path.join(outputDirectory, 'examples.json'), JSON.stringify(output, null, 2) + '\n');
    await fs.writeFile(path.join(outputDirectory, 'index.html'), await renderComparison(output));
    console.log(`Created ${output.length} comparisons: ${path.resolve(outputDirectory, 'index.html')}`);
  } finally {
    await screenshots.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateComparison(process.argv[2]).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
