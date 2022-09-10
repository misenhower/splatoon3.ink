import { Console } from 'node:console';
import consoleStamp from 'console-stamp';

export default function prefixedConsole(...prefixes) {
  let result = new Console({ stdout: process.stdout, stderr: process.stderr });

  let prefix = prefixes.map(s => `[${s}]`).join(' ');
  let format = `:date(dd.mm.yyyy HH:MM:ss.l) :label(7) ${prefix}`.trim();
  consoleStamp(result, { format });

  return result;
}
