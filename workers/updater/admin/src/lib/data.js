// Shapes the published data listing for the Data page. Pure functions; no Vue in here.

const MINUTE = 60_000;

// The files the public site cannot do without. The fast lane rewrites them at least every
// fifteen minutes, so an older copy means updates are not landing.
export const WATCHED = [
  { key: 'data/schedules.json', label: 'Schedules', maxAgeMs: 20 * MINUTE },
  { key: 'data/gear.json', label: 'Gear', maxAgeMs: 20 * MINUTE },
  { key: 'data/coop.json', label: 'Co-op', maxAgeMs: 20 * MINUTE },
  { key: 'data/festivals.json', label: 'Festivals', maxAgeMs: 20 * MINUTE },
];

const GROUPS = [
  { key: 'core', label: 'Site data', test: name => !name.includes('/') && name.endsWith('.json') && !name.startsWith('festivals.ranking.') },
  { key: 'locale', label: 'Translations', test: name => name.startsWith('locale/') },
  { key: 'xrank', label: 'X-Rank', test: name => name.startsWith('xrank/') },
  { key: 'rankings', label: 'Splatfest rankings', test: name => name.startsWith('festivals.ranking.') },
  { key: 'calendars', label: 'Calendars', test: name => name.endsWith('.ics') },
  { key: 'other', label: 'Other', test: () => true },
];

/**
 * @param {{ key: string, size: number, uploaded: number }[]} files From /admin/api/data
 * @param {number} now
 * @returns {{ key: string, label: string, maxAgeMs: number, file: object|null, ageMs: number|null, state: 'fresh'|'stale'|'missing' }[]}
 *   Each watched file and whether its copy is current
 */
export function watchedFiles(files, now) {
  return WATCHED.map(watched => {
    let file = files.find(candidate => candidate.key === watched.key) ?? null;
    let ageMs = file ? now - file.uploaded : null;

    return { ...watched, file, ageMs, state: !file ? 'missing' : ageMs > watched.maxAgeMs ? 'stale' : 'fresh' };
  });
}

/**
 * Sort the files into the page's sections, each newest first.
 * @param {{ key: string, size: number, uploaded: number }[]} files
 * @param {string} [search] Only files whose name contains this
 * @returns {{ key: string, label: string, files: object[], newest: number|null, size: number }[]} Sections with files
 */
export function groupFiles(files, search = '') {
  let needle = search.toLowerCase();
  let groups = GROUPS.map(group => ({ key: group.key, label: group.label, files: [], newest: null, size: 0 }));

  for (let file of files) {
    let name = file.key.replace(/^data\//, '');

    if (needle && !name.toLowerCase().includes(needle)) continue;

    let group = groups[GROUPS.findIndex(candidate => candidate.test(name))];

    group.files.push({ ...file, name });
    group.newest = Math.max(group.newest ?? 0, file.uploaded);
    group.size += file.size;
  }

  for (let group of groups) {
    group.files.sort((a, b) => b.uploaded - a.uploaded || a.name.localeCompare(b.name));
  }

  return groups.filter(group => group.files.length);
}

/**
 * @param {number} bytes
 * @returns {string} For example 812 B, 14.2 kB, 1.3 MB
 */
export function formatSize(bytes) {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(1)} kB`;

  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
