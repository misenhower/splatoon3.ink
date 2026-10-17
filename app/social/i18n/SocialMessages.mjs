import get from 'lodash/get.js';
import fs from 'node:fs/promises';
import english from './en-US.json' with { type: 'json' };
import japanese from './ja-JP.json' with { type: 'json' };

const catalogs = new Map([
  ['en-US', english],
  ['ja-JP', japanese],
]);

export class MissingTranslationError extends Error {}

export default class SocialMessages {
  constructor(locale = 'en-US', translations = null) {
    if (!catalogs.has(locale)) {
      throw new Error(`Unsupported social locale: ${locale}`);
    }

    this.locale = locale;
    this.catalog = catalogs.get(locale);
    this.translations = translations;
  }

  async load() {
    if (this.locale === 'en-US' || this.translations) return;

    try {
      this.translations = JSON.parse(await fs.readFile(`dist/data/locale/${this.locale}.json`, 'utf8'));
    } catch (cause) {
      throw new MissingTranslationError(`Cannot load ${this.locale} game translations`, { cause });
    }
  }

  game(category, node, field = 'name') {
    if (this.locale === 'en-US') return get(node, field);

    const id = node?.__splatoon3ink_id ?? node?.id;
    const value = get(this.translations?.[category]?.[id], field);

    if (typeof value !== 'string' || !value) {
      throw new MissingTranslationError(`Missing ${this.locale} translation: ${category}.${id}.${field}`);
    }

    return value;
  }

  date(value) {
    return new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(value));
  }

  period(start, end) {
    if (this.locale === 'en-US') return '';

    return `${this.date(start)}〜${this.date(end)}（日本時間）`;
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
