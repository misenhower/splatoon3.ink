import { useI18n } from 'vue-i18n';
import { useTimeStore } from '../stores/time';

export function formatDateTime(value) {
  return (new Date(value)).toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatTime(value) {
  return (new Date(value)).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function getDurationParts(value) {
  let negative = (value < 0) ? '-' : '';
  value = Math.abs(value);

  let days = Math.floor(value / 86400);
  value -= days * 86400;
  let hours = Math.floor(value / 3600) % 24;
  value -= hours * 3600;
  let minutes = Math.floor(value / 60) % 60;
  value -= minutes * 60;
  let seconds = value % 60;

  return { negative, days, hours, minutes, seconds };
}

// Countdown duration (e.g., 1d 13h 21m 19s)
// "hideSeconds" only hides seconds when the time is >= 1 hour, this is used in the Salmon Run box
export function formatDuration(value, hideSeconds = false) {
  const i18n = useI18n()
  let { negative, days, hours, minutes, seconds } = getDurationParts(value);

  // Add leading zeros
  if (days || hours)
    minutes = ('0' + minutes).substr(-2);
  seconds = ('0' + seconds).substr(-2);

  // Format for translation
  days = days && `${days}${i18n.t('time.d')}`;
  hours = (days || hours) && `${hours}${i18n.t('time.h')}`;
  minutes = `${minutes}${i18n.t('time.m')}`;
  seconds = `${seconds}${i18n.t('time.s')}`;

  if (days)
    return negative + (hideSeconds ? `${days} ${hours} ${minutes}` : `${days} ${hours} ${minutes} ${seconds}`);
  if (hours)
    return negative + (hideSeconds ? `${hours} ${minutes}` : `${hours} ${minutes} ${seconds}`);
  return negative + `${minutes} ${seconds}`;
}

export function formatDurationFromNow(value, hideSeconds = false) {
  let time = useTimeStore();

  return formatDuration((Date.parse(value) - time.now) / 1000, hideSeconds);
}

export function formatShortDuration(value) {
  const i18n = useI18n()
  let { negative, days, hours, minutes, seconds } = getDurationParts(value);

  if (days)
    return `${negative}${days} ${days === 1 ? i18n.t('time.day') : i18n.t('time.days')}`;
  if (hours)
    return `${negative}${hours} ${hours === 1 ? i18n.t('time.hour') : i18n.t('time.hours')}`;
  if (minutes)
    return `${negative}${minutes} ${minutes === 1 ? i18n.t('time.minute') : i18n.t('time.minutes')}`;
  return `${negative}${seconds} ${seconds === 1 ? i18n.t('time.second') : i18n.t('time.seconds')}`;
}

export function formatShortDurationFromNow(value) {
  let time = useTimeStore();

  return formatShortDuration((Date.parse(value) - time.now) / 1000);
}

export function formatDurationHours(value) {
  const i18n = useI18n()
  let { negative, days, hours } = getDurationParts(value);

  hours += 24 * days;

  return `${negative}${hours} ${hours === 1 ? i18n.t('time.hour') : i18n.t('time.hours')}`;
}

export function formatDurationHoursFromNow(value) {
  let time = useTimeStore();

  return formatDurationHours((Date.parse(value) - time.now) / 1000);
}
