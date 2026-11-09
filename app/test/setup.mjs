import { beforeEach } from 'vitest';
import { useMemoryStorage } from './storage.mjs';

beforeEach(() => {
  useMemoryStorage();
});
