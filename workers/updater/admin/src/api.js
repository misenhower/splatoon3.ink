export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options) {
  let response;

  try {
    response = await fetch(`/admin/api${path}`, { cache: 'no-store', ...options });
  } catch {
    throw new ApiError('Could not reach the updater.', 0);
  }

  let body = await response.json().catch(() => null);

  if (!response.ok) {
    // An expired Access session answers with a sign-in redirect or a 401.
    let message = response.status === 401
      ? 'Your session has ended. Reload the page to sign in again.'
      : body?.error ?? `The updater answered with HTTP ${response.status}.`;

    throw new ApiError(message, response.status);
  }

  return body;
}

export const api = {
  status: () => request('/status'),
  log: () => request('/log'),
  social: () => request('/social'),
  data: () => request('/data'),
  activity: (from, to) => request(`/activity?from=${Math.floor(from)}&to=${Math.ceil(to)}`),
  run: (lane, id, at) => request(`/run?lane=${encodeURIComponent(lane)}&id=${encodeURIComponent(id)}${at ? `&at=${at}` : ''}`),
  archiveRun: id => request(`/archive/run?id=${encodeURIComponent(id)}`),
  authEvent: (region, at) => request(`/auth/event?region=${encodeURIComponent(region)}&at=${at}`),
  post: (path, body) => request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
};
