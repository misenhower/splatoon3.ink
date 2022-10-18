import path from 'path';

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

    let url = new URL(node.image.url);
    let id =path.basename(url.pathname, '.png');

    return {
        '__splatoon3ink_id': id,
        ...node,
    };
}
