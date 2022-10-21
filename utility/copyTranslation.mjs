// This utility copies translations from SplatNet language files to our own language files
// Usage:
//   node utility/copyTranslation.mjs CoopHistory.title salmonrun.title

import fs from 'fs/promises';
import set from 'lodash/set.js';

const sourcePath = 'storage/locale';
const destinationPath = 'src/assets/i18n';

const locales = {
  'de-DE': 'locale0.chunk.js.0.json',
  'en-GB': 'locale1.chunk.js.0.json',
  'en-US': 'main.js.0.json',
  'es-ES': 'locale3.chunk.js.0.json',
  'es-MX': 'locale4.chunk.js.0.json',
  'fr-CA': 'locale5.chunk.js.0.json',
  'fr-FR': 'locale6.chunk.js.0.json',
  'it-IT': 'locale7.chunk.js.0.json',
  'ja-JP': 'locale8.chunk.js.0.json',
  'ko-KR': 'locale9.chunk.js.0.json',
  'nl-NL': 'locale10.chunk.js.0.json',
  'ru-RU': 'locale11.chunk.js.0.json',
  'zh-CN': 'locale12.chunk.js.0.json',
  'zh-TW': 'locale13.chunk.js.0.json',
};

async function readFile(file) {
  try {
    return JSON.parse(await fs.readFile(file));
  } catch (e) {
    return {};
  }
}

async function writeFile(file, data) {
  await fs.writeFile(file, JSON.stringify(data, undefined, 2) + '\n');
}

(async () => {
  let source = process.argv[2];
  let destination = process.argv[3];

  if (!source) {
    console.log('Missing source');
    return;
  }

  for (let locale of Object.keys(locales)) {
    let sourceLang = await readFile(`${sourcePath}/${locales[locale]}`);
    let value = sourceLang[source];

    console.log(`${locale}: ${value}`);

    if (destination) {
      let destinationFile = `${destinationPath}/${locale}.json`;
      let destinationLang = await readFile(destinationFile);
      set(destinationLang, destination, value);

      await writeFile(destinationFile, destinationLang);
    }
  }
})();
