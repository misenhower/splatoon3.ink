import { execFile, spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';
import * as tar from 'tar-stream';
import TarZstdWriter from './TarZstdWriter.mjs';

const execFileAsync = promisify(execFile);

async function listFiles(stream) {
  let files = [];
  let extract = tar.extract();
  extract.on('entry', (header, entry, next) => {
    files.push(header.name);
    entry.on('end', next);
    entry.resume();
  });
  await pipeline(stream, extract);

  return files;
}

it.runIf(process.platform === 'darwin')('does not add macOS metadata files', async () => {
  let temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'splatoon3ink-tar-test-'));
  let sourceDirectory = path.join(temporaryDirectory, 'source');
  let archivePath = path.join(temporaryDirectory, 'archive.tar.zst');
  let rawArchivePath = path.join(temporaryDirectory, 'archive.tar');

  try {
    await fs.mkdir(sourceDirectory);
    let sourcePath = path.join(sourceDirectory, 'sample.json');
    await fs.writeFile(sourcePath, '{}\n');
    await execFileAsync('xattr', ['-w', 'com.splatoon3ink.test', 'metadata', sourcePath]);
    let rawTarEnvironment = { ...process.env };
    delete rawTarEnvironment.COPYFILE_DISABLE;
    await execFileAsync('tar', [
      '-cf', rawArchivePath,
      '-C', sourceDirectory,
      '--', 'sample.json',
    ], { env: rawTarEnvironment });
    expect(await listFiles(createReadStream(rawArchivePath))).toEqual([
      '._sample.json',
      'sample.json',
    ]);

    await new TarZstdWriter().write(sourceDirectory, archivePath, ['sample.json']);

    let zstd = spawn('zstd', ['-dc', archivePath]);
    expect(await listFiles(zstd.stdout)).toEqual(['sample.json']);
  } finally {
    await fs.rm(temporaryDirectory, { force: true, recursive: true });
  }
});
