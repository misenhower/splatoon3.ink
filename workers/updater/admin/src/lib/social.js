// Shapes the post log for the Social page and the timeline. Pure functions; no Vue in here.

const GROUP_WINDOW = 2 * 60_000;

/**
 * Fold the post log into rows: one status going to several accounts in the same run is one
 * row, and so is the same failure on several accounts.
 * @param {object[]} posts Events from the post log, newest first
 * @returns {object[]} Rows with their accounts, newest first
 */
export function groupPosts(posts) {
  let groups = [];

  for (let post of posts ?? []) {
    let group = groups.find(candidate =>
      candidate.type === post.type
      && candidate.generator?.key === post.generator?.key
      && candidate.error === post.error
      && !!candidate.manual === !!post.manual
      && (post.runId ? candidate.runId === post.runId : Math.abs(candidate.at - post.at) < GROUP_WINDOW));

    if (!group) {
      group = {
        key: post.id ?? `${post.at}:${post.generator?.key}:${post.client?.key}`,
        at: post.at,
        type: post.type,
        generator: post.generator,
        error: post.error,
        manual: !!post.manual,
        runId: post.runId ?? null,
        clients: [],
      };
      groups.push(group);
    }

    group.at = Math.max(group.at, post.at);

    // The log is newest first; list accounts in the order they were posted to.
    if (post.client) {
      group.clients.unshift(post.client);
    }
  }

  return groups;
}

/**
 * @param {object} group A row from groupPosts()
 * @returns {string} For example "Schedules to 5 accounts" or "Regular Gear on Bluesky"
 */
export function describeGroup(group) {
  let name = group.generator?.name ?? 'Unknown status';

  if (!group.clients.length) {
    return group.type === 'error' ? `${name} could not be generated` : name;
  }

  if (group.clients.length === 1) {
    return `${name} ${group.type === 'error' ? 'on' : 'to'} ${group.clients[0].name}`;
  }

  return `${name} ${group.type === 'error' ? 'on' : 'to'} ${group.clients.length} accounts`;
}

/**
 * For each account and status, the delivery that matters now: when it last arrived, and the
 * failure since then if the newest attempt failed.
 * @param {Record<string, Record<string, { postedAt: number }>>} lastPosted By account, then status
 * @param {object[]} posts Events from the post log, newest first
 * @returns {Record<string, Record<string, { postedAt: number|null, failure: object|null }>>} By account, then status
 */
export function deliveryGrid(lastPosted, posts) {
  let grid = {};
  let cell = (client, generator) => (grid[client] ??= {})[generator] ??= { postedAt: null, failure: null, seen: false };

  for (let [client, generators] of Object.entries(lastPosted ?? {})) {
    for (let [generator, { postedAt }] of Object.entries(generators)) {
      cell(client, generator).postedAt = postedAt;
    }
  }

  // Only the newest event for a pair says whether it is failing right now.
  for (let post of posts ?? []) {
    if (!post.client || !post.generator) continue;

    let entry = cell(post.client.key, post.generator.key);

    if (entry.seen) continue;

    entry.seen = true;

    if (post.type === 'error' && post.at > (entry.postedAt ?? 0)) {
      entry.failure = post;
    }
  }

  return grid;
}

/**
 * Posts as marks for the timeline's social row.
 * @param {object[]} posts Events from the post log, newest first
 * @param {number} start
 * @param {number} end
 * @returns {object[]} Marks, oldest first
 */
export function postMarks(posts, start, end) {
  return groupPosts((posts ?? []).filter(post => post.at >= start && post.at <= end))
    .map(group => ({
      key: `post:${group.key}`,
      at: group.at,
      end: group.at,
      state: group.type === 'error' ? 'failed' : 'ok',
      title: group.error ? `${describeGroup(group)}: ${group.error}` : describeGroup(group),
      to: { name: 'social' },
    }))
    .reverse();
}
