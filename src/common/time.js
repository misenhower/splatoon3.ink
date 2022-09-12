import { useTimeStore } from '../stores/time';

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
  let { negative, days, hours, minutes, seconds } = getDurationParts(value);

  // Add leading zeros
  if (days || hours)
      minutes = ('0' + minutes).substr(-2);
  seconds = ('0' + seconds).substr(-2);

  // Format for translation
  days = days && `${days}d`;
  hours = (days || hours) && `${hours}h`;
  minutes = `${minutes}m`;
  seconds = `${seconds}s`;

  if (days)
      return negative + (hideSeconds ? `${days} ${hours} ${minutes}` :  `${days} ${hours} ${minutes} ${seconds}`);
  if (hours)
      return negative + (hideSeconds ? `${hours} ${minutes}` :  `${hours} ${minutes} ${seconds}`);
  return negative + `${minutes} ${seconds}`;
}

export function formatDurationFromNow(value, hideSeconds = false) {
  let time = useTimeStore();

  return formatDuration((Date.parse(value) - time.now) / 1000, hideSeconds);
}
