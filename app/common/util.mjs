export function getTopOfCurrentHour(date = null) {
    date ??= new Date;

    date.setUTCMinutes(0);
    date.setUTCSeconds(0);

    return Math.trunc(date.getTime() / 1000) * 1000;
}
