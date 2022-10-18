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

export function deriveId(node) {
    // Unfortunately, SplatNet doesn't return IDs for a lot of gear properties.
    // Derive IDs from image URLs instead.

    let url = node.image.url;

    let hash = crypto.createHash('shake256', { outputLength: 8 });
    let id = hash.update(url).digest('hex');

    return {
        '__splatoon3ink_id': id,
        ...node,
    };
}
