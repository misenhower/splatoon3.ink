import fs from 'fs/promises';
import mkdirp from 'mkdirp';
import ScreenshotHelper from "../screenshots/ScreenshotHelper.mjs";
import StatusGenerator from "./generators/StatusGenerator.mjs";
import TwitterClient from "./TwitterClient.mjs";

export default class StatusGeneratorManager
{
  /** @type {StatusGenerator[]} */
  generators;

  /** @type {TwitterClient} */
  client;

  /** @type {ScreenshotHelper} */
  screenshotHelper;

  constructor(generators = []) {
    this.generators = generators;
    this.client = new TwitterClient;
    this.screenshotHelper = new ScreenshotHelper;
  }

  async sendStatuses() {
    for (let generator of this.generators) {
      if (!(await generator.shouldPost())) {
        continue;
      }

      await generator.sendStatus(this.screenshotHelper, this.client);
    }

    await this.screenshotHelper.close();
  }

  async testStatuses() {
    for (let generator of this.generators) {
      let dir = 'temp';
      await mkdirp(dir);

      let status = await generator.getStatus(this.screenshotHelper);

      let imgFilename = `temp/${generator.key}.png`;
      await fs.writeFile(imgFilename, status.media[0].file);

      let text = [
        'Status:',
        status.status,
        '',
        'Alt text:',
        status.media[0].altText,
      ].join('\n');

      let textFilename = `temp/${generator.key}.txt`;
      await fs.writeFile(textFilename, text);
    }

    await this.screenshotHelper.close();
  }
}
