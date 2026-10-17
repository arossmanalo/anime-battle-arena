/**
 * Converts a sheet from the Universal LPC Spritesheet Character Generator into this game's format.
 *
 *   npm run import-lpc -- <lpc-sheet.png> <fighter-id>
 *
 * Writes public/assets/fighters/<id>/sheet.png + sheet.json (right-facing idle, run, cast, hit, ko)
 * and a portrait.png cropped from the front-facing frame. Remember to add the generator's credits
 * to public/assets/CREDITS.md — LPC art requires attribution.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ANIMS, type AnimName, type SheetConfig } from '../src/game/assets';
import { blankImage, blit, decodePng, encodePng, type Image } from './png';

const FRAME = 64;
/** Rows face up, left, down, right within each animation block. */
const RIGHT = 3;
const DOWN = 2;

interface Source {
  row: number;
  /** First frame and number of frames to take from that row. */
  start: number;
  count: number;
}

/** Row layouts by sheet height. Row numbers are 0-based. */
const LAYOUTS: Record<number, { name: string; anims: Record<AnimName, Source>; front: Source }> = {
  // Current generator: 54 rows (spellcast, thrust, walk, slash, shoot, hurt, climb, idle, jump, sit,
  // emote, run, combat idle, backslash, halfslash).
  54: {
    name: 'Universal LPC (54 rows)',
    anims: {
      idle: { row: 42 + RIGHT, start: 0, count: 2 }, // combat idle
      run: { row: 38 + RIGHT, start: 0, count: 8 },
      cast: { row: 0 + RIGHT, start: 0, count: 7 }, // spellcast
      hit: { row: 20, start: 0, count: 2 }, // hurt (only drawn facing down)
      ko: { row: 20, start: 0, count: 6 },
    },
    front: { row: 22 + DOWN, start: 0, count: 1 },
  },
  // Classic LPC: 21 rows (spellcast, thrust, walk, slash, shoot, hurt). No idle/run rows, so use walk.
  21: {
    name: 'classic LPC (21 rows)',
    anims: {
      idle: { row: 8 + RIGHT, start: 0, count: 1 },
      run: { row: 8 + RIGHT, start: 1, count: 8 },
      cast: { row: 0 + RIGHT, start: 0, count: 7 },
      hit: { row: 20, start: 0, count: 2 },
      ko: { row: 20, start: 0, count: 6 },
    },
    front: { row: 8 + DOWN, start: 0, count: 1 },
  },
};

const PORTRAIT_SIZE = 128;
/** Head area within a 64×64 LPC frame, scaled up for the portrait. */
const HEAD = { x: 16, y: 6, size: 32 };

function main(): void {
  const [input, id] = process.argv.slice(2);
  if (!input || !id || !/^[a-z0-9_-]+$/.test(id)) {
    console.error('Usage: npm run import-lpc -- <lpc-sheet.png> <fighter-id>');
    process.exit(1);
  }
  const src = decodePng(readFileSync(input));
  const rows = src.height / FRAME;
  const layout = LAYOUTS[rows];
  if (src.width < 13 * FRAME || !layout) {
    console.error(`Unexpected sheet size ${src.width}x${src.height}. Expected 832 wide and 54 or 21 rows of 64px.`);
    process.exit(1);
  }

  const columns = Math.max(...ANIMS.map((a) => layout.anims[a].count));
  const out = blankImage(columns * FRAME, ANIMS.length * FRAME);
  ANIMS.forEach((anim, row) => {
    const s = layout.anims[anim];
    for (let i = 0; i < s.count; i++) blit(src, (s.start + i) * FRAME, s.row * FRAME, FRAME, FRAME, out, i * FRAME, row * FRAME);
  });

  const dir = join(import.meta.dirname, '..', 'public', 'assets', 'fighters', id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'sheet.png'), encodePng(out));
  const config: SheetConfig = {
    frameWidth: FRAME,
    frameHeight: FRAME,
    frames: Object.fromEntries(ANIMS.map((a) => [a, layout.anims[a].count])),
  };
  writeFileSync(join(dir, 'sheet.json'), JSON.stringify(config, null, 2) + '\n');
  writeFileSync(join(dir, 'portrait.png'), encodePng(portrait(src, layout.front)));

  console.log(`Imported ${layout.name} sheet as "${id}":`);
  for (const a of ANIMS) console.log(`  ${a.padEnd(5)} ${layout.anims[a].count} frame(s) from row ${layout.anims[a].row + 1}`);
  console.log(`Wrote ${dir}\\{sheet.png, sheet.json, portrait.png}`);
  console.log('Next: add the generator credits to public/assets/CREDITS.md, then restart `npm run dev`.');
}

/** Front-facing head, scaled up with nearest-neighbour, on a transparent background. */
function portrait(src: Image, front: Source): Image {
  const scale = PORTRAIT_SIZE / HEAD.size;
  const out = blankImage(PORTRAIT_SIZE, PORTRAIT_SIZE);
  const ox = front.start * FRAME + HEAD.x;
  const oy = front.row * FRAME + HEAD.y;
  for (let y = 0; y < PORTRAIT_SIZE; y++) {
    for (let x = 0; x < PORTRAIT_SIZE; x++) {
      const from = ((oy + Math.floor(y / scale)) * src.width + ox + Math.floor(x / scale)) * 4;
      src.data.copy(out.data, (y * PORTRAIT_SIZE + x) * 4, from, from + 4);
    }
  }
  return out;
}

main();
