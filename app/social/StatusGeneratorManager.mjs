// @sentry/core reports to whichever SDK the runtime initialized (Node or Cloudflare).
import * as Sentry from '@sentry/core';
import prefixedConsole from '../common/prefixedConsole.mjs';
import ScreenshotHelper from '../screenshots/ScreenshotHelper.mjs';
import Client from './clients/Client.mjs';
import StatusGenerator from './generators/StatusGenerator.mjs';
import { MissingTranslationError } from './i18n/SocialMessages.mjs';
import { readSocialSettings } from './SocialSettings.mjs';

function describe(target) {
  return target ? { key: target.key, name: target.name } : null;
}

export default class StatusGeneratorManager
{
  /** @type {StatusGenerator[]} */
  generators;

  /** @type {Client[]} */
  clients;

  /**
   * What this manager did, for the admin panel's post log: one entry per post sent to an
   * account and one per failure (generating a status, or sending it anywhere).
   * @type {{ at: number, type: 'posted'|'error', generator: object, client: object|null, locale: string, error?: string }[]}
   */
  events = [];

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

    // Create screenshots in parallel
    let statusPromises = this._getStatuses(availableClients, force);

    // Process each client in parallel (while maintaining post order)
    await this._sendStatusesToClients(statusPromises, availableClients);

    return this.events;
  }

  _record(type, generator, client, error) {
    // Internal writers succeed on every run; only their failures are worth keeping.
    if (type === 'posted' && client?.internal) {
      return;
    }

    this.events.push({
      at: Date.now(),
      type,
      generator: describe(generator),
      client: describe(client),
      locale: client?.locale ?? generator?.locale ?? 'en-US',
      ...(error !== undefined && { error: error?.message ?? String(error) }),
    });
  }

  async _getAvailableClients() {
    let clients = [];
    let { disabledClients } = await readSocialSettings();

    for (let client of this.clients) {
      if (!(await client.canSend())) {
        this.console(client).warn('Client cannot send (missing credentials)');
        continue;
      }

      if (disabledClients[client.key]) {
        this.console(client).info('Posting is turned off for this account, skipping');
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
      if (e instanceof MissingTranslationError) {
        this.console(generator).warn('Waiting for game translations:', e.message);
      } else {
        this.console(generator).error('Error generating status:', e);
        Sentry.captureException(e);
        this._record('error', generator, null, e);
      }
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
      const postLocale = status.locale ?? 'en-US';
      const accountLocale = client.locale ?? 'en-US';

      if (postLocale !== accountLocale) {
        throw new Error(`Cannot send ${postLocale} content to a ${accountLocale} account`);
      }

      await client.send(status, generator);
      await generator.updatelastPostCache(client);
      this._record('posted', generator, client);
    } catch (e) {
      this.console(generator, client).error('Error posting:', e);
      Sentry.captureException(e);
      this._record('error', generator, client, e);
    }
  }
}
