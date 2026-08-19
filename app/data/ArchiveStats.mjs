import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import pLimit from 'p-limit';
import prefixedConsole from '../common/prefixedConsole.mjs';

const manifestSuffix = '.tar.zst.manifest.json';
const requestLimit = pLimit(10);

export function reportArchiveStats(verbose = false) {
  let stats = new ArchiveStats;
  stats.verbose = verbose;

  return stats.process();
}

export function reportArchiveStatsFromCli(args) {
  if (args.some(argument => argument !== '--verbose')) {
    throw new Error('Usage: npm run data:archive:stats -- [--verbose]');
  }

  return reportArchiveStats(args.includes('--verbose'));
}

export default class ArchiveStats
{
  verbose = false;

  async process() {
    if (!this.canRun) {
      this.console.log('Skipping archive stats');

      return;
    }

    this.console.log('Reading archive manifests...');
    let keys = await this.getManifestKeys();
    let archives = await Promise.all(keys.map(key => requestLimit(() => this.readManifest(key))));
    archives.sort((a, b) => a.path.localeCompare(b.path));

    if (this.verbose) {
      for (let archive of archives) {
        this.console.log(this.describeArchive(archive));
      }
    }

    let originalBytes = archives.reduce((total, archive) => total + archive.originalBytes, 0);
    let compressedBytes = archives.reduce((total, archive) => total + archive.compressedBytes, 0);
    let fileCount = archives.reduce((total, archive) => total + archive.fileCount, 0);
    let savedBytes = originalBytes - compressedBytes;

    this.console.log(
      `${archives.length} archives containing ${fileCount} files: `
      + `${this.formatBytes(originalBytes)} -> ${this.formatBytes(compressedBytes)}; `
      + `saved ${this.formatBytes(savedBytes)} (${this.formatPercent(savedBytes, originalBytes)}), `
      + `${this.formatRatio(originalBytes, compressedBytes)}:1 compression`,
    );
  }

  // Properties

  get console() {
    this._console ??= prefixedConsole('Archive Stats');

    return this._console;
  }

  get canRun() {
    return process.env.AWS_S3_ENDPOINT
      && process.env.AWS_REGION
      && process.env.AWS_S3_ARCHIVE_BUCKET
      && process.env.AWS_ACCESS_KEY_ID
      && process.env.AWS_SECRET_ACCESS_KEY;
  }

  get s3Client() {
    return this._client ??= new S3Client({
      endpoint: process.env.AWS_S3_ENDPOINT,
      region: process.env.AWS_REGION,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  // Manifests

  async getManifestKeys() {
    let years = (await this.list('', '/')).prefixes.filter(prefix => /^\d{4}\/$/.test(prefix));
    let yearListings = await Promise.all(years.map(year => {
      return requestLimit(() => this.list(year, '/'));
    }));
    let months = yearListings.flatMap(listing => listing.prefixes)
      .filter(prefix => /^\d{4}\/\d{2}\/$/.test(prefix));
    let monthListings = await Promise.all(months.map(month => {
      return requestLimit(() => this.list(month, '/'));
    }));

    return monthListings.flatMap(listing => listing.objects)
      .map(object => object.Key)
      .filter(key => key && key.endsWith(manifestSuffix));
  }

  async readManifest(key) {
    let response = await this.s3Client.send(new GetObjectCommand({
      Bucket: process.env.AWS_S3_ARCHIVE_BUCKET,
      Key: key,
    }));
    if (!response.Body) {
      throw new Error(`S3 returned no body for ${key}`);
    }

    let manifest = JSON.parse(await response.Body.transformToString());
    let archivePath = key.slice(0, -'.manifest.json'.length);
    if (manifest.archive?.path !== archivePath
      || !Number.isSafeInteger(manifest.archive?.bytes)
      || manifest.archive.bytes < 1
      || !Array.isArray(manifest.files)
      || manifest.files.some(file => !Number.isSafeInteger(file.bytes) || file.bytes < 0)) {
      throw new Error(`Invalid archive manifest: ${key}`);
    }

    return {
      path: manifest.archive.path,
      compressedBytes: manifest.archive.bytes,
      fileCount: manifest.files.length,
      originalBytes: manifest.files.reduce((total, file) => total + file.bytes, 0),
    };
  }

  async list(prefix, delimiter) {
    let prefixes = [];
    let objects = [];
    let continuationToken;

    do {
      let response = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: process.env.AWS_S3_ARCHIVE_BUCKET,
        ContinuationToken: continuationToken,
        Delimiter: delimiter,
        Prefix: prefix,
      }));
      prefixes.push(...(response.CommonPrefixes ?? []).map(item => item.Prefix).filter(Boolean));
      objects.push(...(response.Contents ?? []));

      if (response.IsTruncated && !response.NextContinuationToken) {
        throw new Error(`S3 listing for ${prefix} was truncated without a continuation token`);
      }
      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return { objects, prefixes };
  }

  // Formatting

  describeArchive(archive) {
    let savedBytes = archive.originalBytes - archive.compressedBytes;

    return `${archive.path}: ${archive.fileCount} ${archive.fileCount === 1 ? 'file' : 'files'}, `
      + `${this.formatBytes(archive.originalBytes)} -> ${this.formatBytes(archive.compressedBytes)}, `
      + `${this.formatPercent(savedBytes, archive.originalBytes)} saved, `
      + `${this.formatRatio(archive.originalBytes, archive.compressedBytes)}:1`;
  }

  formatBytes(bytes) {
    let units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unit = 0;
    let value = bytes;

    while (Math.abs(value) >= 1000 && unit < units.length - 1) {
      value /= 1000;
      unit++;
    }

    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)} ${units[unit]}`;
  }

  formatPercent(part, total) {
    if (total === 0) {
      return '0%';
    }

    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(part / total * 100)}%`;
  }

  formatRatio(originalBytes, compressedBytes) {
    if (compressedBytes === 0) {
      return '0';
    }

    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
      .format(originalBytes / compressedBytes);
  }
}
