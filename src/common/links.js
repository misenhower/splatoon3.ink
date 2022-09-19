const baseUrl = 'com.nintendo.znca://znca/game/4834290508791808';

export function getGesotownGearUrl(id) {
  return `${baseUrl}?p=/gesotown/${id}`
}
