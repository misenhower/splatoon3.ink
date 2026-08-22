import path from 'node:path';
import {
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';

export default class ArchiveInventory
{
  constructor(s3Client) {
    this._client = s3Client;
  }

  async getDates() {
    let dates = new Map;
    let years = (await this.list('', '/')).prefixes.filter(prefix => /^\d{4}\/$/.test(prefix));

    for (let year of years.sort()) {
      let months = (await this.list(year, '/')).prefixes
        .filter(prefix => /^\d{4}\/\d{2}\/$/.test(prefix));

      for (let month of months.sort()) {
        let listing = await this.list(month, '/');

        for (let prefix of listing.prefixes) {
          let date = this.dateFromPrefix(prefix);
          if (date) {
            dates.set(date, this.createDate(date, prefix, true));
          }
        }

        for (let object of listing.objects) {
          let match = object.Key?.match(/^(\d{4}\/\d{2})\/(\d{4}-\d{2}-\d{2})\.tar\.zst(\.manifest\.json)?$/);
          if (!match || `${match[1]}/` !== month || !this.isDate(match[2])) {
            continue;
          }

          let date = match[2];
          if (`${date.slice(0, 4)}/${date.slice(5, 7)}/` !== month) {
            continue;
          }
          let item = dates.get(date) ?? this.createDate(
            date,
            `${date.slice(0, 4)}/${date.slice(5, 7)}/${date.slice(8, 10)}/`,
            false,
          );
          if (match[3]) {
            item.hasManifest = true;
          } else {
            item.hasArchive = true;
          }
          dates.set(date, item);
        }
      }
    }

    for (let item of dates.values()) {
      if (item.hasArchive !== item.hasManifest) {
        throw new Error(`Archive and manifest are incomplete for ${item.date}`);
      }
    }

    return [...dates.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  async getSourceObjects(prefix) {
    let listing = await this.list(prefix);

    return listing.objects
      .filter(object => object.Key && object.Key !== prefix && !object.Key.endsWith('/'))
      .map(object => {
        if (!object.LastModified
          || !Number.isFinite(object.Size)
          || typeof object.ETag !== 'string') {
          throw new Error(`S3 returned incomplete metadata for ${object.Key}`);
        }

        return {
          path: this.relativePath(prefix, object.Key),
          bytes: object.Size,
          etag: object.ETag,
          key: object.Key,
          lastModified: object.LastModified,
        };
      })
      .sort((a, b) => a.path.localeCompare(b.path));
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

  createDate(date, prefix, hasSource) {
    let month = `${date.slice(0, 4)}/${date.slice(5, 7)}/`;
    let archiveKey = `${month}${date}.tar.zst`;

    return {
      archiveKey,
      date,
      hasArchive: false,
      hasManifest: false,
      hasSource,
      manifestKey: `${archiveKey}.manifest.json`,
      prefix,
    };
  }

  dateFromPrefix(prefix) {
    let match = prefix.match(/^(\d{4})\/(\d{2})\/(\d{2})\/$/);
    if (!match) {
      return null;
    }

    let date = `${match[1]}-${match[2]}-${match[3]}`;

    return this.isDate(date) ? date : null;
  }

  isDate(date) {
    let parsedDate = new Date(`${date}T00:00:00.000Z`);

    return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date;
  }

  relativePath(prefix, key) {
    let relativePath = key.slice(prefix.length);
    if (!key.startsWith(prefix)
      || !relativePath
      || path.posix.normalize(relativePath) !== relativePath
      || path.posix.isAbsolute(relativePath)
      || relativePath.split('/').includes('..')) {
      throw new Error(`Invalid archive object path: ${key}`);
    }

    return relativePath;
  }
}
