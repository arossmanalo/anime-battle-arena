/**
 * Asset conventions shared by the manifest builder (tools/build-asset-manifest.ts) and the Preload scene.
 * No Phaser imports here so the Node tool can use it too.
 *
 * Layout under public/assets/ (every file is optional — anything missing falls back to placeholders):
 *   fighters/<id>/sheet.png                sprite sheet: a grid with one row per animation, in ANIMS order
 *   fighters/<id>/sheet.json               optional: frame size and frame count per row (see SheetConfig)
 *   fighters/<id>/portrait.png             square portrait for HUD / menus
 *   fighters/<id>/form/sheet.png (+ .json) optional sheet used while transformed (same layout)
 *   fx/<skill id>/<part>.png (+ .json)     custom effect sprites for a skill (see FX_PARTS and docs/FX_SPEC.md)
 *   arena/floor.png                        tileable floor texture
 *   sfx/<name>.(ogg|mp3|wav)               overrides the synthesized sound of the same name
 */

/** Sheet rows, top to bottom. `attack` (the default-attack swing) is optional: sheets without it fall back to `cast`. */
export const ANIMS = ['idle', 'run', 'cast', 'hit', 'ko', 'attack'] as const;
export type AnimName = (typeof ANIMS)[number];

/** Frame rate and looping per animation. */
export const ANIM_CONFIG: Record<AnimName, { frameRate: number; loop: boolean }> = {
  idle: { frameRate: 6, loop: true },
  run: { frameRate: 10, loop: true },
  cast: { frameRate: 12, loop: true },
  hit: { frameRate: 12, loop: false },
  ko: { frameRate: 8, loop: false },
  attack: { frameRate: 14, loop: false },
};

export const SFX_NAMES = [
  'hit',
  'hitHeavy',
  'shoot',
  'beam',
  'dash',
  'explosion',
  'buff',
  'charge',
  'transform',
  'domain',
  'ko',
  'fail',
  'click',
  'fight',
] as const;
export type SfxName = (typeof SFX_NAMES)[number];

/** Optional sheet.json next to sheet.png. Defaults: 64x64 frames, every row filled to the sheet's width. */
export interface SheetConfig {
  frameWidth?: number;
  frameHeight?: number;
  /** Frames actually used in each row (rows can be partly empty). */
  frames?: Partial<Record<AnimName, number>>;
}

export const DEFAULT_FRAME_SIZE = 64;

/**
 * Custom effect sprites, one folder per skill (or passive / default attack) id: fx/<id>/<part>.png, a single row of frames.
 *   cast    plays on the caster during the wind-up (looping until the skill fires), or once
 *   body    projectile: flies with it (faces the heading) | zone: fills the area | buff: surrounds the caster while it lasts
 *   start   one-shot where the skill fires (muzzle flash, blink-out puff)
 *   impact  one-shot where it hits (or, for a passive, where it triggers)
 *   slash   domain only: a row of different cut sprites (one frame each, horizontal, edge to edge) scattered across the screen
 *   beams:  body = the beam itself, stretched from the caster to the end (draw it horizontally, edge to edge, facing right;
 *           `size` is its thickness) | muzzle = loops on the caster while it lasts | tip = loops at the far end
 * Anything missing falls back to the built-in generic effect.
 */
export const FX_PARTS = ['cast', 'body', 'start', 'impact', 'muzzle', 'tip', 'slash'] as const;
export type FxPart = (typeof FX_PARTS)[number];

/** Optional fx/<id>/<part>.json. */
export interface FxConfig {
  /** Frame size; defaults to a square the height of the image. */
  frameWidth?: number;
  frameHeight?: number;
  /** Frames in the row; defaults to as many as fit. */
  frames?: number;
  frameRate?: number;
  loop?: boolean;
  /** On-screen width in arena pixels (the arena is 900 wide, a fighter about 90). Defaults depend on the skill. */
  size?: number;
  /** 'add' lights up (good for energy and glows); 'normal' draws opaque pixels as they are. */
  blend?: 'add' | 'normal';
  /** Projectile bodies turn to face where they're going (art drawn facing right). Default true. */
  rotate?: boolean;
}

export interface FxInfo {
  frameWidth: number;
  frameHeight: number;
  frames: number;
  frameRate: number;
  loop: boolean;
  size?: number;
  blend: 'add' | 'normal';
  rotate: boolean;
}

export const FX_DEFAULTS: Record<FxPart, { loop: boolean; frameRate: number }> = {
  cast: { loop: true, frameRate: 14 },
  body: { loop: true, frameRate: 14 },
  start: { loop: false, frameRate: 18 },
  impact: { loop: false, frameRate: 18 },
  muzzle: { loop: true, frameRate: 14 },
  tip: { loop: true, frameRate: 14 },
  slash: { loop: false, frameRate: 1 },
};

export interface SheetInfo {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  frames: Record<AnimName, number>;
}

export interface AssetManifest {
  /** Changes whenever the manifest is rebuilt; appended to asset URLs so the browser never shows a stale cached image. */
  version?: string;
  fighters: Record<string, { sheet: SheetInfo | null; portrait: boolean; formSheet?: SheetInfo | null }>;
  /** Custom effect sprites by skill id. */
  fx?: Record<string, Partial<Record<FxPart, FxInfo>>>;
  floor: boolean;
  /** Sound name → file path relative to public/assets/. */
  sfx: Partial<Record<SfxName, string>>;
}

export const EMPTY_MANIFEST: AssetManifest = { fighters: {}, floor: false, sfx: {}, fx: {} };

export const ASSET_ROOT = 'assets/';
/** `form` selects the transformed variant (fighters/<id>/form/). */
export const fighterSheetKey = (id: string, form = false) => `fighter_${id}${form ? '_form' : ''}`;
export const portraitKey = (id: string) => `portrait_${id}`;
export const animKey = (id: string, anim: AnimName, form = false) => `${id}${form ? '_form' : ''}_${anim}`;
export const fxKey = (id: string, part: FxPart) => `fx_${id}_${part}`;
export const FLOOR_KEY = 'arena_floor';
export const sfxKey = (name: SfxName) => `sfx_${name}`;
