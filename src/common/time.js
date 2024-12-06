import { useI18n } from 'vue-i18n';
import { useTimeStore } from '@/stores/time';

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
  const { t } = useI18n();

  let { negative, days, hours, minutes, seconds } = getDurationParts(value);

  // Add leading zeros
  if (days || hours)
    minutes = ('0' + minutes).substr(-2);
  seconds = ('0' + seconds).substr(-2);

  // Format for translation
  days = days && t('time.d', days);
  hours = (days || hours) && t('time.h', hours);
  minutes = t('time.m', { n: minutes }, minutes);
  seconds = t('time.s', { n: seconds }, seconds);

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
  const { t } = useI18n();
  let { negative, days, hours, minutes, seconds } = getDurationParts(value);

  days = days && t('time.days', days);
  hours = hours && t('time.hours', hours);
  minutes = minutes && t('time.minutes', { n: minutes }, minutes);
  seconds = t('time.seconds', { n: seconds }, seconds);

  if (days)
    return hours ? `${negative}${days} ${hours}` : `${negative}${days}`;
  if (hours)
    return `${negative}${hours}`;
  if (minutes)
    return `${negative}${minutes}`;
  return `${negative}${seconds}`;
}

export function formatShortDurationFromNow(value) {
  let time = useTimeStore();

  return formatShortDuration((Date.parse(value) - time.now) / 1000);
}

export function formatDurationHours(value) {
  const { t } = useI18n();
  let { negative, days, hours } = getDurationParts(value);

  hours += 24 * days;

  return t('time.hours', { n: `${negative}${hours}` }, hours);
}

export function formatDurationHoursFromNow(value) {
  let time = useTimeStore();

  return formatDurationHours((Date.parse(value) - time.now) / 1000);
}
