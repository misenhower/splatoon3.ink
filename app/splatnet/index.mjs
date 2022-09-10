import NsoClient from "./NsoClient.mjs";
import SplatNet3Client, { SPLATNET3_WEB_SERVICE_ID } from "./SplatNet3Client.mjs";

/**
 * Cache Warming
 *
 * This helps ensure we have reliable access to the SplatNet 3 API,
 * even if e.g. the imink API has intermittent downtime.
 */
export async function warmCache() {
  console.info('Warming caches...');

  let nso = new NsoClient;
  let splatnet = new SplatNet3Client;

  await safe(() => nso.getCoralApi(false));
  await safe(() => nso.getWebServiceToken(SPLATNET3_WEB_SERVICE_ID, false));
  await safe(() => splatnet.getBulletToken(false));
}

async function safe(callable) {
  try {
    await callable();
  } catch (e) {
    console.error(e);
  }
}
