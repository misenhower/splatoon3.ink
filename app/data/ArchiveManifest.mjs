import path from 'node:path';

const sha256Pattern = /^sha256:[a-f0-9]{64}$/;

export function createArchiveManifest(date, archive, files) {
  return {
    version: 1,
    date,
    createdAt: new Date().toISOString(),
    archive,
    files,
  };
}

export function getArchiveManifestStats(manifest) {
  return {
    path: manifest.archive.path,
    compressedBytes: manifest.archive.bytes,
    fileCount: manifest.files.length,
    originalBytes: manifest.files.reduce((total, file) => total + file.bytes, 0),
  };
}

export function parseArchiveManifest(contents, archivePath) {
  let manifest = JSON.parse(contents);
  let filePaths = new Set;
  if (manifest.version !== 1
    || !isDate(manifest.date)
    || typeof manifest.createdAt !== 'string'
    || !Number.isFinite(Date.parse(manifest.createdAt))
    || manifest.archive?.path !== archivePath
    || !Number.isSafeInteger(manifest.archive?.bytes)
    || manifest.archive.bytes < 1
    || !sha256Pattern.test(manifest.archive?.hash)
    || !Array.isArray(manifest.files)
    || manifest.files.some(file => {
      if (!isRelativePath(file.path)
        || filePaths.has(file.path)
        || !Number.isSafeInteger(file.bytes)
        || file.bytes < 0
        || !sha256Pattern.test(file.hash)) {
        return true;
      }

      filePaths.add(file.path);

      return false;
    })) {
    throw new Error(`Invalid archive manifest: ${archivePath}`);
  }

  return manifest;
}

function isDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  let parsedDate = new Date(`${date}T00:00:00.000Z`);

  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date;
}

function isRelativePath(filePath) {
  return typeof filePath === 'string'
    && filePath.length > 0
    && !path.posix.isAbsolute(filePath)
    && path.posix.normalize(filePath) === filePath
    && !filePath.split('/').includes('..');
}
