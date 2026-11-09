import { afterEach, describe, expect, it, vi } from 'vitest';
import prefixedConsole from './prefixedConsole.mjs';

describe('prefixedConsole', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefixes messages and keeps format placeholders working', () => {
    let info = vi.spyOn(console, 'info').mockImplementation(() => {});

    prefixedConsole('Updater', 'US').info('Fetching page %s', 2);

    expect(info).toHaveBeenCalledWith('[Updater] [US] Fetching page %s', 2);
  });

  it('passes non-string values after the prefix', () => {
    let error = vi.spyOn(console, 'error').mockImplementation(() => {});
    let failure = new Error('failed');

    prefixedConsole('Images').error(failure);

    expect(error).toHaveBeenCalledWith('[Images]', failure);
  });

  it('looks up the global console when called', () => {
    let logger = prefixedConsole('Late');
    let warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logger.warn('message');

    expect(warn).toHaveBeenCalledWith('[Late] message');
  });
});
