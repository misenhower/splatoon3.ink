import * as Sentry from '@sentry/node';
import { S3Client } from '@aws-sdk/client-s3';
import prefixedConsole from '../common/prefixedConsole.mjs';
import ArchiveBuilder from './ArchiveBuilder.mjs';
import ArchiveInventory from './ArchiveInventory.mjs';
import { AppleDoubleArchiveError } from './ArchiveContentVerifier.mjs';
import RemoteArchiveVerifier from './RemoteArchiveVerifier.mjs';

export function verifyArchives(maxDays = Infinity, repair = false) {
  let verification = new ArchiveVerifyCommand;
  verification.maxDays = maxDays;
  verification.repair = repair;

  return verification.process();
}

export function verifyArchivesFromCli(args) {
  let maxDays = Infinity;
  let repair = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--repair') {
      repair = true;
    } else if (args[i] === '--max-days' && /^\d+$/.test(args[i + 1])) {
      maxDays = Number(args[++i]);
    } else {
      throw new Error(
        'Usage: npm run data:archive:verify -- [--repair] [--max-days DAYS]',
      );
    }
  }

  if (maxDays < 1) {
    throw new Error('--max-days must be at least 1');
  }

  return verifyArchives(maxDays, repair);
}

export default class ArchiveVerifyCommand
{
  maxDays = Infinity;
  repair = false;

  constructor(s3Client, remoteArchiveVerifier, archiveBuilder, archiveInventory) {
    this._client = s3Client;
    this._remoteArchiveVerifier = remoteArchiveVerifier;
    this._archiveBuilder = archiveBuilder;
    this._archiveInventory = archiveInventory;
  }

  async process() {
    if (!this.canRun) {
      this.console.log('Skipping archive verification');

      return;
    }

    let currentDate;
    let affected = 0;
    let checked = 0;
    let repaired = 0;

    try {
      let candidates = await this.getCandidates();
      this.console.log(`Found ${candidates.length} dates to verify`);

      for (let candidate of candidates) {
        if ((this.repair ? affected : checked) >= this.maxDays) {
          break;
        }

        currentDate = candidate.date;
        let sourceObjects = candidate.hasSource
          ? await this.archiveInventory.getSourceObjects(candidate.prefix)
          : null;
        checked++;

        try {
          await this.remoteArchiveVerifier.verify(candidate, sourceObjects);
          this.console.log(`Verified ${candidate.date}`);
        } catch (error) {
          if (!(error instanceof AppleDoubleArchiveError)) {
            throw error;
          }

          affected++;
          if (!this.repair) {
            this.console.log(`${candidate.date} contains unexpected macOS metadata`);
          } else {
            if (!sourceObjects) {
              throw new Error(`Cannot repair ${candidate.date}; its source files have been pruned`);
            }
            await this.archiveBuilder.build(candidate, sourceObjects);
            repaired++;
            this.console.log(`Repaired ${candidate.date}`);
          }
        }
      }
    } catch (error) {
      this.console.error(error);
      Sentry.withScope(scope => {
        if (currentDate) {
          scope.setTag('archive.date', currentDate);
        }
        Sentry.captureException(error);
      });
      await Sentry.flush(2000).catch(() => {});
      throw error;
    }

    if (this.repair) {
      this.console.log(`Verified ${checked} daily archives; repaired ${repaired}`);
    } else {
      this.console.log(`Verified ${checked} daily archives; ${affected} need repair`);
    }
  }

  get console() {
    this._console ??= prefixedConsole('Archive Verification');

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

  get remoteArchiveVerifier() {
    return this._remoteArchiveVerifier ??= new RemoteArchiveVerifier(this.s3Client);
  }

  get archiveBuilder() {
    return this._archiveBuilder ??= new ArchiveBuilder(this.s3Client);
  }

  get archiveInventory() {
    return this._archiveInventory ??= new ArchiveInventory(this.s3Client);
  }

  async getCandidates() {
    return (await this.archiveInventory.getDates()).filter(item => item.hasArchive);
  }
}
