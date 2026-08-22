import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import * as tar from 'tar-stream';

class ArchiveContentError extends Error {}

export class AppleDoubleArchiveError extends ArchiveContentError
{
  constructor(filePath) {
    super(`Tar archive contains an unexpected file: ${filePath}`);
    this.path = filePath;
  }
}

function processCompletion(child) {
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
          `zstd failed (${signal ? `signal ${signal}` : `exit ${code}`}): ${stderr.trim()}`,
        ));
      }
    });
  });
}

function decompressZstd(stream) {
  let zstd = spawn('zstd', ['-dc'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  return {
    completed: Promise.all([
      pipeline(stream, zstd.stdin),
      processCompletion(zstd),
    ]),
    stream: zstd.stdout,
  };
}

export default class ArchiveVerifier
{
  constructor(decompress = decompressZstd) {
    this.decompress = decompress;
  }

  async verify(archiveStream, manifest, sourceObjects) {
    let inventory;
    try {
      inventory = this.matchFiles(manifest.files, sourceObjects);
    } catch (error) {
      archiveStream.destroy?.();
      throw error;
    }

    let archiveBytes = 0;
    let archiveHash = crypto.createHash('sha256');
    let inspector = new Transform({
      transform(chunk, encoding, callback) {
        archiveBytes += chunk.length;
        archiveHash.update(chunk);
        callback(null, chunk);
      },
    });
    let decompressor = this.decompress(inspector);
    let results = await Promise.allSettled([
      pipeline(archiveStream, inspector),
      decompressor.completed,
      this.verifyTar(decompressor.stream, inventory),
    ]);
    let verificationResult = results[2];
    if (verificationResult.status === 'rejected'
      && verificationResult.reason instanceof ArchiveContentError) {
      throw verificationResult.reason;
    }
    let errors = results
      .filter(result => result.status === 'rejected')
      .map(result => result.reason);
    if (errors.length === 1) {
      throw errors[0];
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Could not verify archive');
    }

    if (archiveBytes !== manifest.archive.bytes) {
      throw new Error('Archive size does not match its manifest');
    }
    if (`sha256:${archiveHash.digest('hex')}` !== manifest.archive.hash) {
      throw new Error('Archive SHA-256 does not match its manifest');
    }
  }

  matchFiles(manifestFiles, sourceObjects) {
    let manifestByPath = new Map(manifestFiles.map(file => [file.path, file]));
    let sourceByPath = new Map(sourceObjects.map(object => [object.path, object]));
    if (manifestByPath.size !== manifestFiles.length
      || sourceByPath.size !== sourceObjects.length
      || manifestByPath.size !== sourceByPath.size
      || [...manifestByPath].some(([filePath, file]) => {
        let source = sourceByPath.get(filePath);

        return !source || source.bytes !== file.bytes;
      })) {
      throw new Error('Live source files do not match the archive manifest');
    }

    return { manifestByPath, sourceByPath };
  }

  async verifyTar(stream, { manifestByPath, sourceByPath }) {
    let extract = tar.extract();
    let verified = new Set;
    extract.on('entry', (header, entry, next) => {
      this.verifyEntry(header, entry, manifestByPath, sourceByPath, verified)
        .then(next)
        .catch(error => extract.destroy(error));
    });
    await pipeline(stream, extract);

    if (verified.size !== manifestByPath.size) {
      throw new ArchiveContentError('Tar archive is missing files from its manifest');
    }
  }

  async verifyEntry(header, entry, manifestByPath, sourceByPath, verified) {
    if (header.type !== 'file') {
      throw new ArchiveContentError(`Tar archive contains a non-file entry: ${header.name}`);
    }
    if (verified.has(header.name)) {
      throw new ArchiveContentError(`Tar archive contains a duplicate file: ${header.name}`);
    }

    let manifestFile = manifestByPath.get(header.name);
    let sourceObject = sourceByPath.get(header.name);
    if (!manifestFile || !sourceObject) {
      if (path.posix.basename(header.name).startsWith('._')) {
        throw new AppleDoubleArchiveError(header.name);
      }

      throw new ArchiveContentError(`Tar archive contains an unexpected file: ${header.name}`);
    }
    verified.add(header.name);

    let bytes = 0;
    let md5 = crypto.createHash('md5');
    let sha256 = crypto.createHash('sha256');
    for await (let chunk of entry) {
      bytes += chunk.length;
      md5.update(chunk);
      sha256.update(chunk);
    }

    if (bytes !== manifestFile.bytes) {
      throw new ArchiveContentError(`Size does not match the manifest for ${header.name}`);
    }
    if (`sha256:${sha256.digest('hex')}` !== manifestFile.hash) {
      throw new ArchiveContentError(`SHA-256 does not match the manifest for ${header.name}`);
    }

    let etag = sourceObject.etag;
    if (etag.startsWith('"') && etag.endsWith('"')) {
      etag = etag.slice(1, -1);
    }
    if (!/^[a-fA-F0-9]{32}$/.test(etag)) {
      throw new ArchiveContentError(`S3 ETag is not an MD5 hash for ${header.name}`);
    }
    if (md5.digest('hex') !== etag.toLowerCase()) {
      throw new ArchiveContentError(`MD5 does not match the S3 ETag for ${header.name}`);
    }
  }
}
