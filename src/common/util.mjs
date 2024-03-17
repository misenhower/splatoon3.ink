export function br2nl(str, replace = '\n') {
  return str.replace(/<br\s*\/?>/gi, replace);
}
