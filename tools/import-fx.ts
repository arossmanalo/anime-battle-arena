/**
 * Imports a generated effect animation (a row or grid of frames) as a custom skill effect.
 *
 *   npm run import-fx -- <image> <skill-id> <part> [options]
 *
 *   <skill-id>   e.g. gojo.red, gojo.purple, gojo.attack (default attack), gojo.limitless (passive)
 *   <part>       cast | body | start | impact   (see FX_PARTS in src/game/assets.ts)
 *
 * Options:
 *   --bg auto|black|transparent|flat   how to remove the background (default auto: transparent, black or a flat colour)
 *                                      black = the image is glow-on-black; brightness becomes opacity (best for energy FX)
 *   --grid CxR        split the image into equal cells instead of detecting frames (e.g. --grid 4x1)
 *   --frames N        expected number of frames: if detection finds more (a frame made of separate pieces), the
 *                     closest neighbours are merged until N remain
 *   --pick A-B       use only frames A to B (1-based, in reading order), so one image can hold several effects
 *   --cell N | WxH    frame size in px (default: just big enough for the largest frame, at most 512)
 *   --fill            stretch each frame to the whole cell (backgrounds such as a domain; use with --grid and --bg none)
 *   --fps N           frame rate        --loop | --once      override the default for this part
 *   --size PX         on-screen width in arena px (the arena is 900 wide, a fighter is about 90)
 *   --blend add|normal   how it is drawn (default: add for black backgrounds, otherwise normal)
 *   --no-rotate       a projectile body should not turn to face its heading
 *   --copy-to FOLDER  also save the source and results there
 *
 * Frames are read left to right, top to bottom. All frames share one scale, so effects that grow (explosions)
 * keep their growth. Writes public/assets/fx/<skill-id>/<part>.png (one row) and <part>.json.
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import { FX_DEFAULTS, FX_PARTS, type FxConfig, type FxPart } from '../src/game/assets';

/** Pixels fainter than this don't count as content when looking for frames (dim haze and noise can bridge the gaps). */
const ALPHA_CUTOFF = 56;
/** Detected frames are grown by this much so the faint edge of a glow isn't cropped. */
const FRAME_PAD = 10;
/** Gaps narrower than this between frames (px) don't separate them. */
const MIN_GAP = 6;
const MAX_CELL = 512;
const BG_TOLERANCE = 40;

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const opts: Record<string, string | true> = {};
  const flags = new Set(['fill', 'loop', 'once', 'no-rotate']);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const name = argv[i].slice(2);
      opts[name] = flags.has(name) ? true : argv[++i];
    } else positional.push(argv[i]);
  }
  return { input: positional[0], id: positional[1], part: positional[2] as FxPart, opts };
}

/** Makes the background transparent in place. Returns a description of what was done. */
function removeBackground(data: Buffer, w: number, h: number, mode: string): { note: string; keyed: boolean } {
  const at = (x: number, y: number) => (y * w + x) * 4;
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
  const transparentBg = corners.filter((i) => data[i + 3] < 64).length >= 3;
  const darkBg = corners.filter((i) => Math.max(data[i], data[i + 1], data[i + 2]) < 40 && data[i + 3] >= 64).length >= 3;
  const chosen = mode === 'auto' ? (transparentBg ? 'transparent' : darkBg ? 'black' : 'flat') : mode;

  if (chosen === 'black') {
    // Glow on black: opacity = brightness, colour = brightness-normalised, so glows fade out smoothly.
    for (let i = 0; i < data.length; i += 4) {
      const m = Math.max(data[i], data[i + 1], data[i + 2]);
      if (m === 0) {
        data[i + 3] = 0;
        continue;
      }
      const k = 255 / m;
      data[i] = Math.min(255, Math.round(data[i] * k));
      data[i + 1] = Math.min(255, Math.round(data[i + 1] * k));
      data[i + 2] = Math.min(255, Math.round(data[i + 2] * k));
      data[i + 3] = Math.round((data[i + 3] * m) / 255);
    }
    return { note: 'black background keyed out by brightness', keyed: true };
  }
  if (chosen === 'flat') {
    const bg = [0, 1, 2].map((c) => corners.reduce((s, i) => s + data[i + c], 0) / corners.length);
    const isBg = (i: number) => Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]) < BG_TOLERANCE;
    const seen = new Uint8Array(w * h);
    const stack: number[] = [];
    for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
    while (stack.length) {
      const p = stack.pop()!;
      if (seen[p] || !isBg(p * 4)) continue;
      seen[p] = 1;
      data[p * 4 + 3] = 0;
      const x = p % w;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (p >= w) stack.push(p - w);
      if (p < w * (h - 1)) stack.push(p + w);
    }
    return { note: 'flat background flood-filled from the edges', keyed: false };
  }
  return { note: chosen === 'transparent' ? 'already transparent' : 'background kept', keyed: false };
}

/** Runs of consecutive indices where `on(i)` is true, merging runs closer than MIN_GAP. */
function runs(length: number, on: (i: number) => boolean): [number, number][] {
  const out: [number, number][] = [];
  let start = -1;
  let last = -1;
  for (let i = 0; i < length; i++) {
    if (!on(i)) continue;
    if (start < 0) start = i;
    else if (i - last > MIN_GAP) {
      out.push([start, last]);
      start = i;
    }
    last = i;
  }
  if (start >= 0) out.push([start, last]);
  return out;
}

/** Merges the closest neighbouring frames (same row, side by side) until `count` remain. */
function mergeTo(frames: Rect[], count: number): Rect[] {
  const out = [...frames];
  while (out.length > count) {
    let best = -1;
    let bestGap = Infinity;
    for (let i = 0; i + 1 < out.length; i++) {
      const a = out[i];
      const b = out[i + 1];
      const sameRow = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top) > 0;
      const gap = b.left - (a.left + a.width);
      if (sameRow && gap < bestGap) {
        best = i;
        bestGap = gap;
      }
    }
    if (best < 0) break;
    const a = out[best];
    const b = out[best + 1];
    const left = Math.min(a.left, b.left);
    const top = Math.min(a.top, b.top);
    out.splice(best, 2, { left, top, width: Math.max(a.left + a.width, b.left + b.width) - left, height: Math.max(a.top + a.height, b.top + b.height) - top });
  }
  return out;
}

/** Finds frames by projection: horizontal bands of content are rows, vertical bands inside a row are frames. */
function detectFrames(data: Buffer, w: number, h: number): Rect[] {
  const opaque = (x: number, y: number) => data[(y * w + x) * 4 + 3] >= ALPHA_CUTOFF;
  const frames: Rect[] = [];
  const rowBands = runs(h, (y) => {
    for (let x = 0; x < w; x++) if (opaque(x, y)) return true;
    return false;
  });
  for (const [y0, y1] of rowBands) {
    const colBands = runs(w, (x) => {
      for (let y = y0; y <= y1; y++) if (opaque(x, y)) return true;
      return false;
    });
    for (const [x0, x1] of colBands) {
      // Tighten the vertical extent to this frame's own content.
      let top = y1;
      let bottom = y0;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (opaque(x, y)) {
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
            break;
          }
        }
      }
      const left = Math.max(0, x0 - FRAME_PAD);
      const topPad = Math.max(0, top - FRAME_PAD);
      frames.push({
        left,
        top: topPad,
        width: Math.min(w, x1 + 1 + FRAME_PAD) - left,
        height: Math.min(h, bottom + 1 + FRAME_PAD) - topPad,
      });
    }
  }
  return frames;
}

async function main(): Promise<void> {
  const { input, id, part, opts } = parseArgs(process.argv.slice(2));
  if (!input || !id || !/^[a-z0-9_.-]+$/.test(id) || !FX_PARTS.includes(part)) {
    console.error('Usage: npm run import-fx -- <image> <skill-id> <cast|body|start|impact> [options]   (see the top of tools/import-fx.ts)');
    process.exit(1);
  }

  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const bgMode = String(opts.bg ?? 'auto');
  const bg = bgMode === 'none' ? { note: 'background kept', keyed: false } : removeBackground(data, w, h, bgMode);

  let frames: Rect[];
  if (opts.grid) {
    const [cols, rows] = String(opts.grid).split('x').map(Number);
    if (!(cols >= 1 && rows >= 1)) {
      console.error('--grid needs CxR, e.g. 4x1');
      process.exit(1);
    }
    frames = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        frames.push({ left: Math.floor((c * w) / cols), top: Math.floor((r * h) / rows), width: Math.floor(w / cols), height: Math.floor(h / rows) });
      }
    }
  } else {
    frames = detectFrames(data, w, h);
  }
  if (opts.frames) {
    const want = Number(opts.frames);
    // Fewer than expected: faint glow is joining neighbouring frames. A single row of evenly spaced frames can
    // still be split into equal columns across the content.
    if (frames.length < want && !opts.grid) {
      const left = Math.min(...frames.map((f) => f.left));
      const right = Math.max(...frames.map((f) => f.left + f.width));
      const top = Math.min(...frames.map((f) => f.top));
      const bottom = Math.max(...frames.map((f) => f.top + f.height));
      const colW = (right - left) / want;
      frames = Array.from({ length: want }, (_, i) => ({ left: Math.round(left + i * colW), top, width: Math.round(colW), height: bottom - top }));
      console.log(`Frames were joined by faint glow: split the content into ${want} equal columns.`);
    }
    frames = mergeTo(frames, want);
  }
  console.log(`Found ${frames.length} frame(s) in the image.`);
  if (opts.pick) {
    const [a, b] = String(opts.pick).split('-').map(Number);
    frames = frames.slice(a - 1, b ?? a);
  }
  if (!frames.length) {
    console.error('No frames found. Is the image empty, or the background not removed? Try --bg black, --bg flat or --grid CxR.');
    process.exit(1);
  }

  const fill = !!opts.fill;
  const maxDim = Math.max(...frames.map((f) => Math.max(f.width, f.height)));
  let cellW: number;
  let cellH: number;
  if (opts.cell) {
    const [cw, ch] = String(opts.cell).split('x').map(Number);
    cellW = cw;
    cellH = ch || cw;
  } else if (fill) {
    cellW = Math.min(MAX_CELL * 2, Math.max(...frames.map((f) => f.width)));
    cellH = Math.min(MAX_CELL * 2, Math.max(...frames.map((f) => f.height)));
  } else {
    cellW = cellH = Math.min(MAX_CELL, Math.max(64, Math.round(maxDim * 1.04)));
  }
  const scale = fill ? 1 : Math.min(1, Math.min((cellW * 0.96) / Math.max(...frames.map((f) => f.width)), (cellH * 0.96) / Math.max(...frames.map((f) => f.height))));

  const source = sharp(data, { raw: { width: w, height: h, channels: 4 } });
  const layers: OverlayOptions[] = [];
  for (const [i, f] of frames.entries()) {
    const crop = source.clone().extract({ left: f.left, top: f.top, width: f.width, height: f.height });
    if (fill) {
      layers.push({ input: await crop.resize(cellW, cellH, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer(), left: i * cellW, top: 0 });
      continue;
    }
    const sw = Math.max(1, Math.round(f.width * scale));
    const sh = Math.max(1, Math.round(f.height * scale));
    const img = await crop.resize(sw, sh, { kernel: 'lanczos3' }).png().toBuffer();
    layers.push({ input: img, left: i * cellW + Math.round((cellW - sw) / 2), top: Math.round((cellH - sh) / 2) });
  }

  const dir = join(import.meta.dirname, '..', 'public', 'assets', 'fx', id);
  mkdirSync(dir, { recursive: true });
  await sharp({ create: { width: frames.length * cellW, height: cellH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toFile(join(dir, `${part}.png`));

  const config: FxConfig = {
    frameWidth: cellW,
    frameHeight: cellH,
    frames: frames.length,
    frameRate: opts.fps ? Number(opts.fps) : FX_DEFAULTS[part].frameRate,
    loop: opts.loop ? true : opts.once ? false : FX_DEFAULTS[part].loop,
    blend: opts.blend === 'add' || opts.blend === 'normal' ? opts.blend : bg.keyed ? 'add' : 'normal',
  };
  if (opts.size) config.size = Number(opts.size);
  if (opts['no-rotate']) config.rotate = false;
  writeFileSync(join(dir, `${part}.json`), JSON.stringify(config, null, 2) + '\n');

  console.log(`Imported ${basename(input)} as fx "${id}" / ${part}: ${frames.length} frame(s) of ${cellW}x${cellH}, ${bg.note}.`);
  console.log(`  ${config.frameRate} fps, ${config.loop ? 'loops' : 'plays once'}, blend ${config.blend}${config.size ? `, ${config.size}px wide` : ', default size'}`);
  console.log(`Wrote ${dir}\\${part}.png and ${part}.json`);

  if (opts['copy-to']) {
    const to = String(opts['copy-to']);
    mkdirSync(to, { recursive: true });
    const prefix = `${id}-${part}`;
    for (const ext of ['png', 'json']) copyFileSync(join(dir, `${part}.${ext}`), join(to, `${prefix}.${ext}`));
    copyFileSync(input, join(to, `${prefix}-source${extname(input)}`));
    console.log(`Copied to ${to}`);
  }
}

void main();
