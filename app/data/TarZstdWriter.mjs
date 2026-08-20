import path from 'node:path';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';

function processCompletion(child, name) {
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => {
    stderr += chunk;
  });

  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(
          `${name} failed (${signal ? `signal ${signal}` : `exit ${code}`}): ${stderr.trim()}`,
        ));
      }
    });
  });
}

export default class TarZstdWriter
{
  async write(sourceDirectory, archivePath, files) {
    let tar = spawn('tar', ['-cf', '-', '-C', sourceDirectory, '--', ...files], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let zstd = spawn('zstd', [
      '-19',
      '--long=27',
      '--single-thread',
      '-f',
      '-o', archivePath,
    ], {
      stdio: ['pipe', 'ignore', 'pipe'],
    });

    let results = await Promise.allSettled([
      processCompletion(tar, 'tar'),
      pipeline(tar.stdout, zstd.stdin),
      processCompletion(zstd, 'zstd'),
    ]);
    let errors = results
      .filter(result => result.status === 'rejected')
      .map(result => result.reason);
    if (errors.length > 0) {
      throw new AggregateError(errors, `Could not create ${path.basename(archivePath)}`);
    }
  }
}
