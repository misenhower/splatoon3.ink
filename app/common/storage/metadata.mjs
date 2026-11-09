// Matches what the S3/R2 sync applied to data/ objects.
export const DATA_CACHE_CONTROL = 'no-cache, stale-while-revalidate=5, stale-if-error=86400';

const contentTypes = {
  json: 'application/json',
  ics: 'text/calendar',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
};

export function contentTypeFor(key) {
  return contentTypes[key.split('.').pop().toLowerCase()];
}
