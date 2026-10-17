import get from 'lodash/get.js';
import english from './en-US.json' with { type: 'json' };

const catalogs = new Map([
  ['en-US', english],
]);

export default class SocialMessages {
  constructor(locale = 'en-US') {
    if (!catalogs.has(locale)) {
      throw new Error(`Unsupported social locale: ${locale}`);
    }

    this.locale = locale;
    this.catalog = catalogs.get(locale);
  }

  text(key, params = {}) {
    const template = get(this.catalog, key);

    if (typeof template !== 'string') {
      throw new Error(`Missing social message: ${this.locale}.${key}`);
    }

    return template.replace(/\{(\w+)\}/g, (_, name) => {
      if (!Object.hasOwn(params, name)) {
        throw new Error(`Missing parameter ${name} for social message ${key}`);
      }

      return String(params[name]);
    });
  }

  timeUntil(startTime, now) {
    const hours = Math.floor((startTime - now) / (1000 * 60 * 60));

    if (hours >= 24) {
      const days = Math.round(hours / 24);

      return this.text(days === 1 ? 'time.day' : 'time.days', { count: days });
    }

    return this.text(hours === 1 ? 'time.hour' : 'time.hours', { count: hours });
  }
}
