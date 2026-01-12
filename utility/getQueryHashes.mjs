// Adapted for JS from: https://github.com/imink-app/SplatNet3/blob/master/Sources/SplatNet3Helper/SN3Helper.swift

// This utility fetches GraphQL query hashes from the SplatNet 3 web view
// Usage:
//   node utility/getQueryHashes.mjs

import _ from 'lodash';

const { fromPairs, isPlainObject, mapValues, sortBy, toPairs } = _;

const baseUrl = 'https://api.lp1.av5ja.srv.nintendo.net';
const versionRegex = /=.(?<revision>[0-9a-f]{40}).*revision_info_not_set.*=.(?<version>\d+\.\d+\.\d+)-/;
const hashRegex = /params:\{id:"(?<id>[0-9a-f]{32}|[0-9a-f]{64})",metadata:\{\},name:"(?<name>[a-zA-Z0-9_]+)",/g;

function sortObjectKeys(obj) {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  if (!isPlainObject(obj)) return obj;
  return fromPairs(sortBy(toPairs(mapValues(obj, sortObjectKeys)), 0));
}

(async () => {
  // Fetch main HTML and find the script path
  let html = await (await fetch(baseUrl)).text();
  let scriptMatch = html.match(/<script[^>]+src="([^"]*static[^"]*)"/);
  if (!scriptMatch) {
    console.error('Could not find main.js script in HTML');
    return;
  }

  // Fetch the JavaScript file
  let jsUrl = scriptMatch[1].startsWith('http') ? scriptMatch[1] : baseUrl + scriptMatch[1];
  let js = await (await fetch(jsUrl)).text();

  // Parse version
  let versionMatch = versionRegex.exec(js);
  if (!versionMatch?.groups) {
    console.error('Could not parse version from JavaScript');
    return;
  }
  let version = `${versionMatch.groups.version}-${versionMatch.groups.revision.substring(0, 8)}`;

  // Parse GraphQL hashes
  let hashMap = {};
  let match;
  while ((match = hashRegex.exec(js)) !== null) {
    hashMap[match.groups.name] = match.groups.id;
  }

  let data = sortObjectKeys({
    graphql: { hash_map: hashMap },
    version,
  });

  console.log(JSON.stringify(data, undefined, 2));
})();
