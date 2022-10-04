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
