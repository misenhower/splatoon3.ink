import * as Sentry from '@sentry/node';
import prefixedConsole from '../common/prefixedConsole.mjs';
import ScreenshotHelper from '../screenshots/ScreenshotHelper.mjs';
import Client from './clients/Client.mjs';
import StatusGenerator from './generators/StatusGenerator.mjs';

export default class StatusGeneratorManager
{
  /** @type {StatusGenerator[]} */
  generators;

  /** @type {Client[]} */
  clients;

  console(generator = null, client = null) {
    let prefixes = ['Social', generator?.name, client?.name].filter(s => s);
    return prefixedConsole(...prefixes);
  }

  constructor(generators = [], clients = []) {
    this.generators = generators;
    this.clients = clients;
  }

  async sendStatuses(force = false) {
    let availableClients = await this._getAvailableClients();

    // Create screenshots in parallel (via Browserless)
    let statusPromises = this._getStatuses(availableClients, force);

    // Process each client in parallel (while maintaining post order)
    await this._sendStatusesToClients(statusPromises, availableClients);
  }

  async _getAvailableClients() {
    let clients = [];

    for (let client of this.clients) {
      if (!(await client.canSend())) {
        this.console(client).warn('Client cannot send (missing credentials)');
        continue;
      }

      clients.push(client);
    }

    return clients;
  }

  _getStatuses(availableClients, force) {
    return this.generators.map(generator => this._getStatus(availableClients, generator, force));
  }

  async _getStatus(availableClients, generator, force) {
    let screenshotHelper = new ScreenshotHelper;
    try {
      let clients = [];

      for (let client of availableClients) {
        if (force || await generator.shouldPost(client)) {
          clients.push(client);
        }
      }

      if (clients.length === 0) {
        this.console(generator).info('No status to post, skipping');

        return null;
      }

      await screenshotHelper.open();
      let status = await generator.getStatus(screenshotHelper);

      return { generator, status, clients };
    } catch (e) {
      this.console(generator).error('Error generating status:', e);
      Sentry.captureException(e);
    } finally {
      await screenshotHelper.close();
    }

    return null;
  }

  _sendStatusesToClients(statusPromises, availableClients) {
    return Promise.allSettled(availableClients.map(client => this._sendStatusesToClient(statusPromises, client)));
  }

  async _sendStatusesToClient(statusPromises, client) {
    for (let promise of statusPromises) {
      let statusDetails = await promise;

      if (statusDetails && statusDetails.clients.includes(client)) {
        let { generator, status } = statusDetails;

        await this._sendToClient(generator, status, client);
      }
    }
  }

  async _sendToClient(generator, status, client) {
    this.console(generator, client).info('Posting...');
    try {
      await client.send(status, generator);
      await generator.updatelastPostCache(client);
    } catch (e) {
      this.console(generator, client).error('Error posting:', e);
      Sentry.captureException(e);
    }
  }
}
