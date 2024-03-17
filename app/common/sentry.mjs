import * as Sentry from '@sentry/node';

export function sentryInit() {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.init({ dsn: process.env.SENTRY_DSN });
}
