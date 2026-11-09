/**
 * Width and height from a PNG's IHDR chunk.
 * @param {Uint8Array} bytes
 * @returns {{ width: number, height: number }|null} The size, or null if the bytes are not a PNG
 */
export function pngSize(bytes) {
  let signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  if (!bytes || bytes.length < 24 || !signature.every((byte, index) => bytes[index] === byte)) {
    return null;
  }

  let view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  return { width: view.getUint32(16), height: view.getUint32(20) };
}
