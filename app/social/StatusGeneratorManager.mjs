import prefixedConsole from "../common/prefixedConsole.mjs";
import ScreenshotHelper from "../screenshots/ScreenshotHelper.mjs";
import StatusGenerator from "./generators/StatusGenerator.mjs";

export default class StatusGeneratorManager
{
  /** @type {StatusGenerator[]} */
  generators;

  /** @type {Client[]} */
  clients;

  /** @type {ScreenshotHelper} */
  screenshotHelper;

  console(generator = null, client = null) {
    let prefixes = ['Social', generator?.name, client?.name].filter(s => s);
    return prefixedConsole(...prefixes);
  }

  constructor(generators = [], clients = []) {
    this.generators = generators;
    this.clients = clients;
    this.screenshotHelper = new ScreenshotHelper;
  }

  async shouldPost(generator) {
    for (let client of this.clients) {
      if (await generator.shouldPost(client)) {
        return true;
      }
    }

    return false;
  }

  async sendStatuses(force = false) {
    for (let generator of this.generators) {
      if (!force && !(await this.shouldPost(generator))) {
        this.console(generator).info('No status to post, skipping');

        continue;
      }

      let status = await generator.getStatus(this.screenshotHelper);

      for (let client of this.clients) {
        this.console(generator, client).info('Posting...');
        await client.send(status, generator);
        await generator.updatelastPostCache(client);
      }
    }

    await this.screenshotHelper.close();
  }
}
