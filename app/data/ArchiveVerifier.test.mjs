import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import * as tar from 'tar-stream';
import ArchiveVerifier, { AppleDoubleArchiveError } from './ArchiveVerifier.mjs';

async function createTar(files) {
  let pack = tar.pack();
  for (let [name, contents] of files) {
    pack.entry({
      mode: 0o644,
      mtime: new Date(0),
      name,
    }, contents);
  }
  pack.finalize();

  let chunks = [];
  for await (let chunk of pack) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function manifestFor(archive, fileHash = 'b6a98d9ce9a2d9149288fa3df42d377c3e42737afdcdaf714e33c0a100b51060') {
  return {
    archive: {
      bytes: archive.length,
      hash: 'sha256:5a500b4490cc8d86f7c6970ae673b15933dc1d29f45e6098b730572ec5d2396a',
    },
    files: [{
      path: 'alpha.json',
      bytes: 6,
      hash: `sha256:${fileHash}`,
    }],
  };
}

function sourceObject(etag = '9f9f90dbe3e5ee1218c86b8839db1995') {
  return {
    path: 'alpha.json',
    bytes: 6,
    etag: `"${etag}"`,
  };
}

const identityDecompressor = stream => ({ completed: Promise.resolve(), stream });

describe('ArchiveVerifier', () => {
  it('verifies a tar stream against its manifest and live S3 objects', async () => {
    let archive = await createTar([['alpha.json', 'alpha\n']]);
    let verifier = new ArchiveVerifier(identityDecompressor);

    await expect(verifier.verify(
      Readable.from(archive),
      manifestFor(archive),
      [sourceObject()],
    )).resolves.toBeUndefined();
  });

  it('rejects duplicate live S3 paths', async () => {
    let archive = await createTar([['alpha.json', 'alpha\n']]);
    let source = sourceObject();
    let verifier = new ArchiveVerifier(identityDecompressor);
    let archiveStream = new Readable({
      read() {
        this.destroy(new Error('Archive should not be read'));
      },
    });

    await expect(verifier.verify(
      archiveStream,
      manifestFor(archive),
      [source, source],
    )).rejects.toThrow('Live source files do not match the archive manifest');
  });

  it('rejects a file whose SHA-256 does not match the manifest', async () => {
    let archive = await createTar([['alpha.json', 'alpha\n']]);
    let verifier = new ArchiveVerifier(identityDecompressor);

    await expect(verifier.verify(
      Readable.from(archive),
      manifestFor(archive, '0'.repeat(64)),
      [sourceObject()],
    )).rejects.toThrow('SHA-256 does not match the manifest for alpha.json');
  });

  it('rejects an S3 ETag that is not a plain MD5 hash', async () => {
    let archive = await createTar([['alpha.json', 'alpha\n']]);
    let verifier = new ArchiveVerifier(identityDecompressor);

    await expect(verifier.verify(
      Readable.from(archive),
      manifestFor(archive),
      [sourceObject('multipart-etag-2')],
    )).rejects.toThrow('S3 ETag is not an MD5 hash for alpha.json');
  });

  it('reports an unexpected tar file instead of the resulting broken pipe', async () => {
    let archive = await createTar([
      ['alpha.json', 'alpha\n'],
      ['extra.json', 'extra\n'],
    ]);
    let verifier = new ArchiveVerifier(stream => ({
      completed: Promise.reject(new Error('zstd failed (exit 70): Broken pipe')),
      stream,
    }));

    await expect(verifier.verify(
      Readable.from(archive),
      manifestFor(archive),
      [sourceObject()],
    )).rejects.toThrow('Tar archive contains an unexpected file: extra.json');
  });

  it('identifies unexpected macOS AppleDouble files', async () => {
    let archive = await createTar([
      ['._alpha.json', 'metadata'],
      ['alpha.json', 'alpha\n'],
    ]);
    let verifier = new ArchiveVerifier(identityDecompressor);

    let error = await verifier.verify(
      Readable.from(archive),
      manifestFor(archive),
      [sourceObject()],
    ).catch(reason => reason);

    expect(error).toBeInstanceOf(AppleDoubleArchiveError);
    expect(error.path).toBe('._alpha.json');
  });

  it('rejects a file whose MD5 does not match its S3 ETag', async () => {
    let archive = await createTar([['alpha.json', 'alpha\n']]);
    let verifier = new ArchiveVerifier(identityDecompressor);

    await expect(verifier.verify(
      Readable.from(archive),
      manifestFor(archive),
      [sourceObject('0'.repeat(32))],
    )).rejects.toThrow('MD5 does not match the S3 ETag for alpha.json');
  });
});
