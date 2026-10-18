/**
 * Scans public/assets/ and writes public/assets/manifest.json, so the game only requests files that exist
 * (no 404s for art that hasn't been made yet). Runs automatically before `dev` and `build`.
 *   npm run assets
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ANIMS,
  DEFAULT_FRAME_SIZE,
  FX_DEFAULTS,
  FX_PARTS,
  SFX_NAMES,
  type AssetManifest,
  type FxConfig,
  type FxInfo,
  type FxPart,
  type SheetConfig,
  type SheetInfo,
} from '../src/game/assets';

const root = join(import.meta.dirname, '..', 'public', 'assets');
const manifest: AssetManifest = { version: String(Date.now()), fighters: {}, floor: existsSync(join(root, 'arena', 'floor.png')), sfx: {}, fx: {} };
const problems: string[] = [];

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  if (buf.toString('ascii', 1, 4) !== 'PNG') throw new Error('not a PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readSheet(id: string, dir: string): SheetInfo | null {
  const png = join(dir, 'sheet.png');
  if (!existsSync(png)) return null;
  let cfg: SheetConfig = {};
  const json = join(dir, 'sheet.json');
  if (existsSync(json)) cfg = JSON.parse(readFileSync(json, 'utf8')) as SheetConfig;
  const frameWidth = cfg.frameWidth ?? DEFAULT_FRAME_SIZE;
  const frameHeight = cfg.frameHeight ?? DEFAULT_FRAME_SIZE;
  const { width, height } = pngSize(png);
  const columns = Math.floor(width / frameWidth);
  const rows = Math.floor(height / frameHeight);
  if (width % frameWidth || height % frameHeight) {
    problems.push(`${id}: sheet.png is ${width}x${height}, not a multiple of ${frameWidth}x${frameHeight}`);
  }
  const frames = Object.fromEntries(
    ANIMS.map((anim, row) => [anim, row < rows ? Math.min(columns, cfg.frames?.[anim] ?? columns) : 0]),
  ) as SheetInfo['frames'];
  if (!frames.idle) problems.push(`${id}: no idle row; the sprite will not animate`);
  return { frameWidth, frameHeight, columns, frames };
}

const fightersDir = join(root, 'fighters');
if (existsSync(fightersDir)) {
  for (const id of readdirSync(fightersDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    const dir = join(fightersDir, id);
    const sheet = readSheet(id, dir);
    const portrait = existsSync(join(dir, 'portrait.png'));
    const formSheet = readSheet(`${id} (form)`, join(dir, 'form'));
    if (sheet || portrait) manifest.fighters[id] = { sheet, portrait, formSheet };
  }
}

const fxDir = join(root, 'fx');
if (existsSync(fxDir)) {
  for (const id of readdirSync(fxDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    const parts: Partial<Record<FxPart, FxInfo>> = {};
    for (const part of FX_PARTS) {
      const png = join(fxDir, id, `${part}.png`);
      if (!existsSync(png)) continue;
      const json = join(fxDir, id, `${part}.json`);
      const cfg: FxConfig = existsSync(json) ? (JSON.parse(readFileSync(json, 'utf8')) as FxConfig) : {};
      const { width, height } = pngSize(png);
      const frameHeight = cfg.frameHeight ?? height;
      const frameWidth = cfg.frameWidth ?? frameHeight;
      const frames = Math.max(1, Math.min(cfg.frames ?? Math.floor(width / frameWidth), Math.floor(width / frameWidth)));
      if (height % frameHeight) problems.push(`fx/${id}/${part}.png is ${width}x${height}, not a row of ${frameWidth}x${frameHeight} frames`);
      parts[part] = {
        frameWidth,
        frameHeight,
        frames,
        frameRate: cfg.frameRate ?? FX_DEFAULTS[part].frameRate,
        loop: cfg.loop ?? FX_DEFAULTS[part].loop,
        size: cfg.size,
        blend: cfg.blend ?? 'normal',
        rotate: cfg.rotate ?? true,
        ...(cfg.behind ? { behind: true } : {}),
        ...(cfg.ground ? { ground: true } : {}),
      };
    }
    if (Object.keys(parts).length) manifest.fx![id] = parts;
  }
}

const sfxDir = join(root, 'sfx');
if (existsSync(sfxDir)) {
  const files = readdirSync(sfxDir);
  for (const name of SFX_NAMES) {
    const file = ['ogg', 'mp3', 'wav'].map((ext) => `${name}.${ext}`).find((f) => files.includes(f));
    if (file) manifest.sfx[name] = `sfx/${file}`;
  }
}

writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const fighters = Object.entries(manifest.fighters)
  .map(([id, f]) => `${id}${f.sheet ? '' : ' (portrait only)'}${f.formSheet ? ' +form' : ''}`)
  .join(', ');
console.log(
  `assets: ${Object.keys(manifest.fighters).length} fighter(s)${fighters ? ` [${fighters}]` : ''}, ` +
    `${Object.keys(manifest.fx ?? {}).length} skill fx set(s), floor ${manifest.floor ? 'yes' : 'no'}, ${Object.keys(manifest.sfx).length} sfx override(s)`,
);
for (const p of problems) console.warn(`  warning: ${p}`);
