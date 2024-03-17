const baseUrl = 'https://s.nintendo.com/av5ja-lp1/znca/game/4834290508791808';

export function getGesotownGearUrl(id) {
  return `${baseUrl}?p=/gesotown/${id}`;
}
