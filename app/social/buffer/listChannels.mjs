import BufferApi from './BufferApi.mjs';

export default async function listChannels() {
  const channels = await (new BufferApi).listChannels();

  console.table(channels);
}
