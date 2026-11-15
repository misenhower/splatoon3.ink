import dotenv from 'dotenv';
import consoleStamp from 'console-stamp';
import { sendStatuses, testStatuses } from './social/index.mjs';
import { update } from './data/index.mjs';
import MastodonClient from './social/clients/MastodonClient.mjs';
import ImageWriter from './social/clients/ImageWriter.mjs';
import BlueskyClient from './social/clients/BlueskyClient.mjs';
import ThreadsClient from './social/clients/ThreadsClient.mjs';
import { compressArchivesFromCli } from './data/ArchiveCompressor.mjs';
import { pruneArchivesFromCli } from './data/ArchivePruner.mjs';
import { reportArchiveStatsFromCli } from './data/ArchiveStats.mjs';
import { verifyArchivesFromCli } from './data/ArchiveVerifyCommand.mjs';
import { configureFilesystemStorage } from './common/storage/filesystem.mjs';
import { updateAvatars } from './social/updateAvatars.mjs';
import listBufferChannels from './social/buffer/listChannels.mjs';

consoleStamp(console);
dotenv.config({ quiet: true });
configureFilesystemStorage();

const actions = {
  social: sendStatuses,
  socialTest: testStatuses,
  socialTestMastodon: () => testStatuses([new MastodonClient]),
  socialTestBluesky: () => testStatuses([new BlueskyClient]),
  socialTestImage: () => testStatuses([new ImageWriter]),
  socialTestThreads: () => testStatuses([new ThreadsClient]),
  bufferChannels: listBufferChannels,
  splatnet: update,
  archiveCompress: (...args) => compressArchivesFromCli(args),
  archivePrune: (...args) => pruneArchivesFromCli(args),
  archiveStats: (...args) => reportArchiveStatsFromCli(args),
  archiveVerify: (...args) => verifyArchivesFromCli(args),
  updateAvatars,
};

const command = process.argv[2];
const params = process.argv.slice(3);
const action = actions[command];
if (action) {
  await action(...params);
} else {
  console.error(`Unrecognized command: ${command}`);
}
