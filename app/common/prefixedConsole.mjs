const methods = ['log', 'info', 'warn', 'error', 'debug'];

/**
 * A console whose messages start with [prefix] labels. It forwards to the global console at
 * call time, so the Node CLI's timestamps (console-stamp) and Workers logging both apply.
 * @param {...string} prefixes
 * @returns {Record<'log'|'info'|'warn'|'error'|'debug', (...args: unknown[]) => void>} The prefixed console
 */
export default function prefixedConsole(...prefixes) {
  let prefix = prefixes.map(s => `[${s}]`).join(' ');

  return Object.fromEntries(methods.map(method => [method, (...args) => {
    if (!prefix) {
      return console[method](...args);
    }

    // Keep printf-style placeholders in the first argument working.
    if (typeof args[0] === 'string') {
      return console[method](`${prefix} ${args[0]}`, ...args.slice(1));
    }

    return console[method](prefix, ...args);
  }]));
}
