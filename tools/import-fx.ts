/**
 * Imports a generated effect animation (a row or grid of frames) as a custom skill effect.
 *
 *   npm run import-fx -- <image> <skill-id> <part> [options]
 *
 *   <skill-id>   e.g. gojo.red, gojo.purple, gojo.attack (default attack), gojo.limitless (passive)
 *   <part>       cast | body | start | impact | muzzle | tip   (see FX_PARTS in src/game/assets.ts)
 *
 * Options:
 *   --bg auto|black|transparent|flat   how to remove the background (default auto: transparent, black or a flat colour)
 *                                      black = the image is glow-on-black; brightness becomes opacity (best for energy FX)
 *   --grid CxR        split the image into equal cells instead of detecting frames (e.g. --grid 4x1)
 *   --trim N         with --grid: cut N px off every edge of each cell (to drop divider lines between frames)
 *   --frames N        how many frames are in the (single-row) image. Cuts it at the emptiest places, which also works when
 *                     frames touch, overlap or are joined by glow. Recommended whenever you know the count
 *   --crop L,T,R,B    only use this part of the image (pixels, or fractions 0-1 of its size), e.g. --crop 0,0,0.32,1
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

/**
 * Splits a single row of `count` frames. Frames that touch or are joined by faint glow can't be found by looking for
 * empty gaps, so this cuts at the `count - 1` columns with the least content (each at least a third of an even
 * frame width from the others and from the edges), then tightens each frame to its own content.
 */
function splitByValleys(data: Buffer, w: number, h: number, count: number): Rect[] {
  const profile = new Float64Array(w);
  let top = h;
  let bottom = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      profile[x] += a;
      if (a >= 40) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  const smooth = profile.map((_, x) => {
    let sum = 0;
    for (let k = -4; k <= 4; k++) sum += profile[Math.min(w - 1, Math.max(0, x + k))];
    return sum / 9;
  });
  // Ignore faint columns (a thin divider line or noise adds a little everywhere) when finding where the content starts and ends.
  const floor = Math.max(...smooth) * 0.03;
  const xs = [...smooth.keys()].filter((x) => smooth[x] > floor);
  const left = xs.length ? xs[0] : 0;
  const right = xs.length ? xs[xs.length - 1] : w - 1;
  const minDist = Math.max(4, Math.round((right - left) / count / 3));
  // Candidate cut points: the centre of each flat-bottomed dip (a clean black gap is a long run of equal values).
  const dips: { x: number; value: number; width: number }[] = [];
  for (let x = left + minDist; x <= right - minDist; ) {
    let end = x;
    while (end + 1 <= right - minDist && Math.abs(smooth[end + 1] - smooth[x]) < 0.5) end++;
    const lower = (i: number) => smooth[Math.min(w - 1, Math.max(0, i))];
    if (lower(x - 1) >= smooth[x] && lower(end + 1) >= smooth[x]) dips.push({ x: Math.round((x + end) / 2), value: smooth[x], width: end - x + 1 });
    x = end + 1;
  }
  dips.sort((p, q) => p.value - q.value || q.width - p.width);
  const cuts: number[] = [];
  for (const d of dips) {
    if (cuts.length >= count - 1) break;
    if (cuts.every((c) => Math.abs(c - d.x) >= minDist)) cuts.push(d.x);
  }
  cuts.sort((a, b) => a - b);
  const bounds = [left, ...cuts, right + 1];
  const out: Rect[] = [];
  for (let i = 0; i + 1 < bounds.length; i++) {
    const x0 = bounds[i];
    const x1 = bounds[i + 1];
    // Tight box around this frame's own content, kept inside its span.
    let l = x1;
    let r = x0;
    let t = bottom;
    let b = top;
    for (let y = top; y <= bottom; y++) {
      for (let x = x0; x < x1; x++) {
        if (data[(y * w + x) * 4 + 3] >= 40) {
          l = Math.min(l, x);
          r = Math.max(r, x);
          t = Math.min(t, y);
          b = Math.max(b, y);
        }
      }
    }
    if (r < l) continue;
    const pad = 6;
    const fl = Math.max(x0, l - pad);
    const ft = Math.max(0, t - pad);
    out.push({ left: fl, top: ft, width: Math.min(x1, r + 1 + pad) - fl, height: Math.min(h, b + 1 + pad) - ft });
  }
  return out;
}

/** Finds frames by projection: horizontal bands of content are rows, vertical bands inside a row are frames. */
function detectFrames(data: Buffer, w: number, h: number, cutoff = ALPHA_CUTOFF): Rect[] {
  const opaque = (x: number, y: number) => data[(y * w + x) * 4 + 3] >= cutoff;
  // The brighter the cutoff, the more of a glow's edge falls outside the box, so grow the box to compensate.
  const pad = FRAME_PAD + Math.round((cutoff - ALPHA_CUTOFF) / 4);
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
      const left = Math.max(0, x0 - pad);
      const topPad = Math.max(0, top - pad);
      frames.push({
        left,
        top: topPad,
        width: Math.min(w, x1 + 1 + pad) - left,
        height: Math.min(h, bottom + 1 + pad) - topPad,
      });
    }
  }
  return frames;
}

async function main(): Promise<void> {
  const { input, id, part, opts } = parseArgs(process.argv.slice(2));
  if (!input || !id || !/^[a-z0-9_.-]+$/.test(id) || !FX_PARTS.includes(part)) {
    console.error('Usage: npm run import-fx -- <image> <skill-id> <cast|body|start|impact|muzzle|tip> [options]   (see the top of tools/import-fx.ts)');
    process.exit(1);
  }

  let image = sharp(input).ensureAlpha();
  if (opts.crop) {
    const meta = await sharp(input).metadata();
    const [l, t, r, b] = String(opts.crop).split(',').map(Number);
    const px = (v: number, size: number) => Math.round(v <= 1 ? v * size : v);
    const left = px(l, meta.width!);
    const top = px(t, meta.height!);
    image = sharp(await sharp(input).extract({ left, top, width: px(r, meta.width!) - left, height: px(b, meta.height!) - top }).png().toBuffer()).ensureAlpha();
  }
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
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
        const t = Number(opts.trim ?? 0);
        frames.push({
          left: Math.floor((c * w) / cols) + t,
          top: Math.floor((r * h) / rows) + t,
          width: Math.floor(w / cols) - 2 * t,
          height: Math.floor(h / rows) - 2 * t,
        });
      }
    }
  } else {
    frames = detectFrames(data, w, h);
  }
  if (opts.frames && !opts.grid) {
    // The frame count is known: cut a single row of frames at the N-1 emptiest places between them.
    frames = splitByValleys(data, w, h, Number(opts.frames));
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
