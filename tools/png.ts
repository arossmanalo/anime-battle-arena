/**
 * Minimal dependency-free PNG reader/writer for the asset tools.
 * Reads 8-bit RGBA / RGB / grayscale(+alpha) / palette PNGs (non-interlaced) and writes 8-bit RGBA.
 */
import { deflateSync, inflateSync } from 'node:zlib';

export interface Image {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel, row-major. */
  data: Buffer;
}

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function decodePng(file: Buffer): Image {
  if (!file.subarray(0, 8).equals(SIGNATURE)) throw new Error('Not a PNG file');
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette: Buffer | null = null;
  let transparency: Buffer | null = null;
  const idat: Buffer[] = [];

  for (let pos = 8; pos < file.length; ) {
    const len = file.readUInt32BE(pos);
    const type = file.toString('ascii', pos + 4, pos + 8);
    const body = file.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      bitDepth = body[8];
      colorType = body[9];
      interlace = body[12];
    } else if (type === 'PLTE') palette = body;
    else if (type === 'tRNS') transparency = body;
    else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`Unsupported PNG bit depth ${bitDepth} (need 8)`);
  if (interlace) throw new Error('Interlaced PNGs are not supported');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`Unsupported PNG colour type ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? pixels[y * stride + x - channels] : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels] : 0;
      const v = line[x];
      const out = filter === 0 ? v : filter === 1 ? v + a : filter === 2 ? v + b : filter === 3 ? v + ((a + b) >> 1) : v + paeth(a, b, c);
      pixels[y * stride + x] = out & 0xff;
    }
  }

  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const p = i * channels;
    let r: number, g: number, b: number, a = 255;
    if (colorType === 6) [r, g, b, a] = [pixels[p], pixels[p + 1], pixels[p + 2], pixels[p + 3]];
    else if (colorType === 2) [r, g, b] = [pixels[p], pixels[p + 1], pixels[p + 2]];
    else if (colorType === 4) [r, g, b, a] = [pixels[p], pixels[p], pixels[p], pixels[p + 1]];
    else if (colorType === 0) [r, g, b] = [pixels[p], pixels[p], pixels[p]];
    else {
      const idx = pixels[p];
      [r, g, b] = [palette![idx * 3], palette![idx * 3 + 1], palette![idx * 3 + 2]];
      a = transparency && idx < transparency.length ? transparency[idx] : 255;
    }
    data.set([r, g, b, a], i * 4);
  }
  return { width, height, data };
}

export function encodePng(img: Image): Buffer {
  const chunk = (type: string, body: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed));
    return Buffer.concat([len, typed, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.width, 0);
  ihdr.writeUInt32BE(img.height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = img.width * 4;
  const raw = Buffer.alloc((stride + 1) * img.height);
  for (let y = 0; y < img.height; y++) img.data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export function blankImage(width: number, height: number): Image {
  return { width, height, data: Buffer.alloc(width * height * 4) };
}

/** Copies a w×h block from src (sx, sy) into dst (dx, dy). */
export function blit(src: Image, sx: number, sy: number, w: number, h: number, dst: Image, dx: number, dy: number): void {
  for (let y = 0; y < h; y++) {
    const from = ((sy + y) * src.width + sx) * 4;
    src.data.copy(dst.data, ((dy + y) * dst.width + dx) * 4, from, from + w * 4);
  }
}
