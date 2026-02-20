const defaultVariant = {
  key: 'default',
  displayName: 'Splatoon3.ink',
  avatar: 'default.png',
};

const variants = [
  {
    key: 'pride',
    displayName: 'Splatoon3.ink',
    avatar: 'pride.png',
    start: { month: 6, day: 1 },
    end: { month: 7, day: 1 },
  },
  {
    key: 'halloween',
    displayName: 'Splatoon3.eek \u{1F383}',
    avatar: 'halloween.png',
    start: { month: 10, day: 1 },
    end: { month: 11, day: 1 },
  },
];

function isDateInRange(date, start, end) {
  let month = date.getMonth() + 1;
  let day = date.getDate();
  let value = month * 100 + day;

  return value >= start.month * 100 + start.day
    && value <= end.month * 100 + end.day;
}

/**
 * Get the avatar variant for the given date (or now).
 * @param {Date} [date]
 */
export function getCurrentVariant(date = new Date()) {
  for (let variant of variants) {
    if (isDateInRange(date, variant.start, variant.end)) {
      return variant;
    }
  }

  return defaultVariant;
}
