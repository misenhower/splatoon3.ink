import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import LocalScreenshotDriver from './drivers/LocalScreenshotDriver.mjs';
import { defaultScreenshotViewport } from '../../src/common/screenshot.mjs';

if (existsSync('.env')) {
  process.loadEnvFile();
}

let driver = new LocalScreenshotDriver;

try {
  let { values } = parseArgs({
    options: {
      route: { type: 'string', default: 'schedules' },
      output: { type: 'string', default: 'dist/test-screenshots/capture.png' },
      help: { type: 'boolean' },
    },
  });

  if (values.help) {
    console.log('Usage: npm run screenshot -- [--route schedules] [--output file.png]');
    console.log('Captures the built site in dist/ with a local Chrome (set CHROME_PATH if it is not found).');
  } else {
    await driver.open();

    let image = await driver.capture(values.route, defaultScreenshotViewport);

    await mkdir(dirname(values.output), { recursive: true });
    await writeFile(values.output, image);

    console.log(`Saved screenshot to ${values.output}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await driver.close();
}
