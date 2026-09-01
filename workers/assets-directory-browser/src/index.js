import Mustache from 'mustache';
import { XMLParser } from 'fast-xml-parser';
import template from './template.html';

const internalPrefix = '/__directory';
const pageSize = 1000;
const archiveMountPrefix = 'data/archive/';

Mustache.parse(template);

const xmlParser = new XMLParser({
  parseTagValue: false,
  trimValues: true,
});

/**
 * @param {unknown} value
 * @returns {unknown[]} The value as an array.
 */
function asArray(value) {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

/**
 * @param {Env} env
 * @param {string} prefix
 * @param {string | undefined} cursor
 * @returns {Promise<R2Objects>} The normalized archive directory listing.
 */
async function listArchive(env, prefix, cursor) {
  let archivePrefix = prefix.slice(archiveMountPrefix.length);
  let archiveOrigin = new URL(env.ARCHIVE_ORIGIN);
  let listUrl = new URL('/', archiveOrigin);
  listUrl.searchParams.set('list-type', '2');
  listUrl.searchParams.set('delimiter', '/');
  listUrl.searchParams.set('max-keys', String(pageSize));
  listUrl.searchParams.set('prefix', archivePrefix);
  if (cursor) {
    listUrl.searchParams.set('continuation-token', cursor);
  }

  let response = await fetch(new Request(listUrl, {
    headers: { Accept: 'application/xml' },
  }));
  if (!response.ok) {
    throw new Error(`Archive listing returned ${response.status}`);
  }

  let document = xmlParser.parse(await response.text());
  let result = document?.ListBucketResult;
  if (!result || typeof result !== 'object') {
    throw new Error('Archive listing returned invalid XML');
  }

  return {
    cursor: result.NextContinuationToken || undefined,
    delimitedPrefixes: asArray(result.CommonPrefixes).map(item => (
      `${archiveMountPrefix}${item.Prefix}`
    )),
    objects: asArray(result.Contents).map(item => ({
      browserKey: `${archiveMountPrefix}${item.Key}`,
      etag: item.ETag,
      key: item.Key,
      size: Number(item.Size),
      uploaded: new Date(item.LastModified),
      url: new URL(publicPath(item.Key), archiveOrigin).href,
    })),
    truncated: result.IsTruncated === 'true',
  };
}

/**
 * @param {string} prefix
 * @param {string | undefined} cursor
 * @param {R2Objects} listing
 * @returns {R2Objects} The listing with any virtual directories added.
 */
function withVirtualDirectories(prefix, cursor, listing) {
  if (prefix !== 'data/' || cursor || listing.delimitedPrefixes.includes(archiveMountPrefix)) {
    return listing;
  }

  return {
    ...listing,
    delimitedPrefixes: [...listing.delimitedPrefixes, archiveMountPrefix].sort(),
  };
}

/** @param {string} key */
function publicPath(key) {
  return `/${key.split('/').map(encodeURIComponent).join('/')}`;
}

/** @param {string} prefix */
function parentPath(prefix) {
  let parts = prefix.split('/').filter(Boolean);
  parts.pop();
  return parts.length ? publicPath(`${parts.join('/')}/`) : '/';
}

/**
 * @param {string} key
 * @param {string} prefix
 */
function displayName(key, prefix) {
  return key.slice(prefix.length);
}

/**
 * @typedef {object} Breadcrumb
 * @property {boolean} [current] Whether this is the current directory.
 * @property {string} [href] Link destination.
 * @property {boolean} [link] Whether this breadcrumb is a link.
 * @property {string} [name] Visible directory name.
 * @property {boolean} [separator] Whether this is a path separator.
 */

/**
 * @param {string} prefix
 * @returns {Breadcrumb[]} Breadcrumb presentation model.
 */
function breadcrumbs(prefix) {
  let parts = prefix.split('/').filter(Boolean);
  if (!parts.length) {
    return [{ current: true, name: 'assets' }];
  }

  /** @type {Breadcrumb[]} */
  let result = [{ href: '/', link: true, name: 'assets' }];
  for (let index = 0; index < parts.length; index++) {
    result.push({ separator: true });
    if (index === parts.length - 1) {
      result.push({ current: true, name: parts[index] });
    } else {
      let path = `${parts.slice(0, index + 1).join('/')}/`;
      result.push({ href: publicPath(path), link: true, name: parts[index] });
    }
  }
  return result;
}

/** @param {number} bytes */
function formatSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  let units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 'B';
  for (let candidate of units) {
    value /= 1024;
    unit = candidate;
    if (value < 1024) {
      break;
    }
  }

  return `${value.toFixed(value < 10 ? 1 : 0)} ${unit}`;
}

/** @param {Date} date */
function formatDate(date) {
  return `${date.toISOString().slice(0, 19).replace('T', ' ')} UTC`;
}

/**
 * @param {string} origin
 * @param {string} prefix
 * @param {R2Objects} listing
 * @param {string | undefined} cursor
 */
function directoryPage(origin, prefix, listing, cursor) {
  let pathname = publicPath(prefix);

  return {
    directories: listing.delimitedPrefixes.map(directoryPrefix => ({
      name: displayName(directoryPrefix, prefix),
      pathname: publicPath(directoryPrefix),
      prefix: directoryPrefix,
      url: new URL(publicPath(directoryPrefix), origin).href,
    })),
    files: listing.objects.map(object => {
      let pathname = publicPath(object.browserKey ?? object.key);
      return {
        etag: object.etag,
        href: object.url ?? pathname,
        key: object.key,
        name: displayName(object.browserKey ?? object.key, prefix),
        pathname,
        size: object.size,
        uploaded: object.uploaded,
        url: object.url ?? new URL(publicPath(object.key), origin).href,
      };
    }),
    nextCursor: listing.truncated ? listing.cursor : undefined,
    pathname,
    prefix,
    requestedCursor: cursor,
    url: new URL(pathname, origin).href,
  };
}

/**
 * @param {Request} request
 * @param {R2Bucket} bucket
 * @param {string} key
 */
async function localObjectResponse(request, bucket, key) {
  let object = await bucket.get(key);
  if (!object) {
    return errorResponse(404, 'Object not found');
  }

  let headers = new Headers;
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('ETag', object.httpEtag);

  return new Response(request.method === 'HEAD' ? null : object.body, {
    headers,
  });
}

/**
 * @param {ReturnType<typeof directoryPage>} page
 * @param {string} styleNonce
 */
function renderListing(page, styleNonce) {
  let rows = [
    ...(page.prefix ? [{
      href: parentPath(page.prefix),
      isParent: true,
      name: 'Parent directory',
    }] : []),
    ...page.directories.map(directory => ({
      href: directory.pathname,
      isFolder: true,
      name: directory.name,
    })),
    ...page.files.map(file => ({
      date: formatDate(file.uploaded),
      datetime: file.uploaded.toISOString(),
      href: file.href,
      isFile: true,
      name: file.name,
      size: formatSize(file.size),
    })),
  ];
  let folderCount = page.directories.length;
  let fileCount = page.files.length;

  return Mustache.render(template, {
    breadcrumbs: breadcrumbs(page.prefix),
    canonicalUrl: page.url,
    hasRows: rows.length > 0,
    jsonCursor: page.requestedCursor ? encodeURIComponent(page.requestedCursor) : false,
    jsonPath: page.pathname,
    next: page.nextCursor ? {
      href: `${page.pathname}?cursor=${encodeURIComponent(page.nextCursor)}`,
    } : false,
    rows,
    styleNonce,
    summary: `${folderCount} ${folderCount === 1 ? 'folder' : 'folders'} · ${fileCount} ${fileCount === 1 ? 'file' : 'files'}`,
    title: `Asset browser — ${page.pathname}`,
  });
}

/**
 * @param {Request} request
 * @param {ReturnType<typeof directoryPage>} page
 */
function jsonListingResponse(request, page) {
  let next = page.nextCursor
    ? new URL(`${page.pathname}?format=json&cursor=${encodeURIComponent(page.nextCursor)}`, page.url).href
    : null;
  return jsonResponse(request, {
    schemaVersion: 1,
    directory: {
      prefix: page.prefix,
      url: page.url,
    },
    directories: page.directories.map(directory => ({
      name: directory.name,
      prefix: directory.prefix,
      url: directory.url,
    })),
    files: page.files.map(file => ({
      name: file.name,
      key: file.key,
      url: file.url,
      size: file.size,
      uploaded: file.uploaded.toISOString(),
      etag: file.etag,
    })),
    next,
  });
}

/**
 * @param {Request} request
 * @param {unknown} value
 * @param {number} status
 * @param {HeadersInit} headers
 */
function jsonResponse(request, value, status = 200, headers = {}) {
  let body = JSON.stringify(value);

  return new Response(request.method === 'HEAD' ? null : body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

/**
 * @param {number} status
 * @param {string} message
 * @param {HeadersInit} headers
 */
function errorResponse(status, message, headers = {}) {
  return new Response(message, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      ...headers,
    },
  });
}

/**
 * @param {Request} request
 * @param {number} status
 * @param {string} code
 * @param {string} message
 * @param {HeadersInit} headers
 */
function listingErrorResponse(request, status, code, message, headers = {}) {
  if (new URL(request.url).searchParams.get('format') !== 'json') {
    return errorResponse(status, message, headers);
  }

  return jsonErrorResponse(request, status, code, message, headers);
}

/**
 * @param {Request} request
 * @param {number} status
 * @param {string} code
 * @param {string} message
 * @param {HeadersInit} headers
 */
function jsonErrorResponse(request, status, code, message, headers = {}) {
  return jsonResponse(request, {
    schemaVersion: 1,
    error: { code, message },
  }, status, headers);
}

/** @type {ExportedHandler<Env>} */
export default {
  async fetch(request, env) {
    let url = new URL(request.url);
    let localDevelopment = env.LOCAL_DEVELOPMENT === 'true';

    if (!['GET', 'HEAD'].includes(request.method)) {
      return listingErrorResponse(request, 405, 'method_not_allowed', 'Method not allowed', { Allow: 'GET, HEAD' });
    }

    let encodedPath;
    if (url.pathname.startsWith(`${internalPrefix}/`)) {
      encodedPath = url.pathname.slice(internalPrefix.length + 1);
    } else if (localDevelopment && url.pathname.endsWith('/')) {
      encodedPath = url.pathname.slice(1);
    } else if (localDevelopment) {
      let key;
      try {
        key = decodeURIComponent(url.pathname.slice(1));
      } catch {
        return listingErrorResponse(request, 400, 'invalid_path', 'Invalid path');
      }
      return localObjectResponse(request, env.ASSETS, key);
    } else {
      return listingErrorResponse(request, 404, 'not_found', 'Not found');
    }

    let prefix;
    try {
      prefix = decodeURIComponent(encodedPath);
    } catch {
      return listingErrorResponse(request, 400, 'invalid_path', 'Invalid path');
    }

    let format = url.searchParams.get('format');
    if (format && format !== 'json') {
      return jsonErrorResponse(request, 400, 'unsupported_format', 'Unsupported format');
    }

    let cursor = url.searchParams.get('cursor') || undefined;
    let archiveListing = prefix.startsWith(archiveMountPrefix);
    /** @type {R2Objects} */
    let listing;
    try {
      listing = archiveListing
        ? await listArchive(env, prefix, cursor)
        : await env.ASSETS.list({
          cursor,
          delimiter: '/',
          limit: pageSize,
          prefix,
        });
    } catch (error) {
      console.error(JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        message: archiveListing
          ? 'Archive directory listing failed'
          : 'R2 directory listing failed',
        prefix,
      }));
      return listingErrorResponse(request, 500, 'listing_unavailable', 'Directory listing unavailable');
    }
    if (prefix && !listing.objects.length && !listing.delimitedPrefixes.length) {
      return listingErrorResponse(request, 404, 'directory_not_found', 'Directory not found');
    }

    listing = withVirtualDirectories(prefix, cursor, listing);
    let page = directoryPage(url.origin, prefix, listing, cursor);
    if (url.searchParams.get('format') === 'json') {
      return jsonListingResponse(request, page);
    }

    let styleNonce = crypto.randomUUID().replaceAll('-', '');
    let html = renderListing(page, styleNonce);

    return new Response(request.method === 'HEAD' ? null : html, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Security-Policy': `default-src 'none'; style-src 'nonce-${styleNonce}'; base-uri 'none'; frame-ancestors 'none'`,
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex',
      },
    });
  },
};
