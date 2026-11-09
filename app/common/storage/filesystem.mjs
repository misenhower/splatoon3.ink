import FilesystemStorage from './FilesystemStorage.mjs';
import { configureStorage } from './index.mjs';

/**
 * The Node runner's layout: public files in dist/, private state and archives in storage/.
 * @param {string} [root] Directory containing dist/ and storage/
 * @returns {object} The three storage areas
 */
export function filesystemStorage(root = '.') {
  return {
    public: new FilesystemStorage(`${root}/dist`, { relocations: { 'splatnet/': 'assets/splatnet/' } }),
    private: new FilesystemStorage(`${root}/storage`),
    archive: new FilesystemStorage(`${root}/storage/archive`),
  };
}

export function configureFilesystemStorage(root) {
  configureStorage(filesystemStorage(root));
}
