import { createI18n } from 'vue-i18n'
import languages from '../assets/i18n'

const LANGUAGE_KEY = 'lang';

export const locales = [
  { code: 'en-US', flag: '🇺🇸', name: 'English' }, // TODO: Change to "English (US)" when adding en-GB
  { code: 'fr-FR', flag: '🇫🇷', name: 'Français' },
  { code: 'de-DE', flag: '🇩🇪', name: 'Deutsch' },
];

let i18n = null;

export function initializeI18n() {
  if (!i18n) {
    i18n = createI18n({
      locale: currentLocale().code,
      fallbackLocale: 'en-US',
      messages: { ...languages },
    });

    // Listen for local storage changes
    window.addEventListener('storage', reload);
  }

  return i18n;
}

function reload() {
  i18n.global.locale.value = currentLocale().code;
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
    let locale = locales.find(l => l.code.startsWith(language) || l.code.startsWith(language.substring(0, 2)));

    if (locale) {
      return locale;
    }
  }

  // Fall back to en-US
  return locales[0];
}
