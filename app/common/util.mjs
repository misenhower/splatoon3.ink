import crypto from 'crypto';

export function getTopOfCurrentHour(date = null) {
    date ??= new Date;

    date.setUTCMinutes(0);
    date.setUTCSeconds(0);

    return Math.trunc(date.getTime() / 1000) * 1000;
}

export function getGearIcon(gear) {
    switch (gear.gear.__typename) {
        case 'HeadGear': return '🧢';
        case 'ClothingGear': return '👕';
        case 'ShoesGear': return '👟';
        default: return null;
    }
}

export function normalizeSplatnetResourcePath(url) {
    // Parse the URL
    let u = new URL(url);

    // Get just the pathname (without the host, query string, etc.)
    let result = u.pathname;

    // Remove "/resources/prod" from the beginning if it exists
    result = result.replace(/^\/resources\/prod/, '');

    // Remove the leading slash
    result = result.replace(/^\//, '');

    return result;
}

export function deriveId(node) {
    // Unfortunately, SplatNet doesn't return IDs for a lot of gear properties.
    // Derive IDs from image URLs instead.

    let path = normalizeSplatnetResourcePath(node.image.url);

    let hash = crypto.createHash('shake256', { outputLength: 8 });
    let id = hash.update(path).digest('hex');

    return {
        '__splatoon3ink_id': id,
        ...node,
    };
}
