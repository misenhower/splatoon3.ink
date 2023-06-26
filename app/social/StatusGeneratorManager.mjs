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

  async sendStatuses(force = false) {
    for (let generator of this.generators) {
      try {
        await this.#generateAndSend(generator, force);
      } catch (e) {
        this.console(generator).error(`Error generating status: ${e}`);
      }
    }

    await this.screenshotHelper.close();
  }

  async #generateAndSend(generator, force) {
    let clientsToPost = [];

    for (let client of this.clients) {
      if (force || await generator.shouldPost(client)) {
        clientsToPost.push(client);
      }
    }

    if (clientsToPost.length === 0) {
      this.console(generator).info('No status to post, skipping');

      return;
    }

    let status = await generator.getStatus(this.screenshotHelper);

    for (let client of clientsToPost) {
      this.console(generator, client).info('Posting...');
      try {
        await client.send(status, generator);
        await generator.updatelastPostCache(client);
      } catch (e) {
        this.console(generator, client).error(`Error posting: ${e}`);
      }
    }
  }
}
