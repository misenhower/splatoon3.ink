import { createI18n } from 'vue-i18n'
import languages from '../assets/i18n/index.mjs'

const LANGUAGE_KEY = 'lang';

export const locales = [
  { code: 'de-DE', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'en-US', flag: '🇺🇸', name: 'English (US)' },
  { code: 'en-GB', flag: '🇬🇧', name: 'English (GB)' },
  { code: 'es-ES', flag: '🇪🇸', name: 'Español (ES)' },
  { code: 'es-MX', flag: '🇲🇽', name: 'Español (MX)' },
  { code: 'fr-FR', flag: '🇫🇷', name: 'Français (FR)' },
  { code: 'fr-CA', flag: '🇨🇦', name: 'Français (CA)' },
  { code: 'it-IT', flag: '🇮🇹', name: 'Italiano' },
  { code: 'ja-JP', flag: '🇯🇵', name: '日本語' },
  { code: 'ko-KR', flag: '🇰🇷', name: '한국어' },
  { code: 'nl-NL', flag: '🇳🇱', name: 'Nederlands' },
  { code: 'ru-RU', flag: '🇷🇺', name: 'Русский' },
  { code: 'zh-CN', flag: '🇨🇳', name: '中文(简体)' },
  { code: 'zh-TW', flag: '🇹🇼', name: '中文(台灣)' },
];

export const defaultLocale = locales.find(l => l.code === 'en-US');

const datetimeFormats = {
  dateTimeShort: { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' },
  dateTimeShortWeekday: { month: 'numeric', weekday: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
  time: { hour: 'numeric', minute: '2-digit' },
};

let i18n = null;

export function initializeI18n() {
  if (!i18n) {
    i18n = createI18n({
      locale: currentLocale().code,
      fallbackLocale: 'en-US',
      messages: { ...languages },
      datetimeFormats: locales.reduce((result, locale) => ({ ...result, [locale.code]: datetimeFormats }), {}),
    });

    // Listen for local storage changes
    window.addEventListener('storage', reload);
    reload();
  }

  return i18n;
}

function reload() {
  i18n.global.locale.value = currentLocale().code;
  loadLocale();

  switch (currentLocale().code) {
    case 'zh-CN':
      document.documentElement.style.setProperty("--font-family-s1", "splatoon1, splatoon1chzh, sans-serif");
      document.documentElement.style.setProperty("--font-family-s2", "splatoon2, splatoon2chzh, sans-serif");
      break;

    case 'zh-TW':
      document.documentElement.style.setProperty("--font-family-s1", "splatoon1, splatoon1twzh, sans-serif");
      document.documentElement.style.setProperty("--font-family-s2", "splatoon2, splatoon2twzh, sans-serif");
      break;

    default:
      document.documentElement.style.setProperty("--font-family-s1", "splatoon1, splatoon1jpja, sans-serif");
      document.documentElement.style.setProperty("--font-family-s2", "splatoon2, splatoon2jpja, sans-serif");
      break;
  }
}

async function loadLocale() {
  let locale = currentLocale().code;
  let response = await fetch(`/data/locale/${locale}.json`);

  if (!response.ok) {
    console.error(response);

    return;
  }

  let json = await response.json();

  i18n.global.setLocaleMessage(locale, {
    ...i18n.global.getLocaleMessage(locale),
    splatnet: json,
  });
}

function currentLocale() {
  return preferredLocale() || detectLocale();
}

function preferredLocale() {
  let code = localStorage && localStorage.getItem(LANGUAGE_KEY);

  return locales.find(l => l.code === code);
}

export function setPreferredLocale(value) {
  localStorage.setItem(LANGUAGE_KEY, value);
  reload();
}

function detectLocale() {
  let languages = window.navigator.languages || [window.navigator.language];

  // Try to find a matching language
  for (let language of languages) {
    let locale = locales.find(l => l.code.startsWith(language))
       || locales.find(l => l.code.startsWith(language.substring(0, 2)));

    if (locale) {
      return locale;
    }
  }

  // Fall back to en-US
  return defaultLocale;
}
