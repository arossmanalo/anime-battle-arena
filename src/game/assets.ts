/**
 * Asset conventions shared by the manifest builder (tools/build-asset-manifest.ts) and the Preload scene.
 * No Phaser imports here so the Node tool can use it too.
 *
 * Layout under public/assets/ (every file is optional — anything missing falls back to placeholders):
 *   fighters/<id>/sheet.png                sprite sheet: a grid with one row per animation, in ANIMS order
 *   fighters/<id>/sheet.json               optional: frame size and frame count per row (see SheetConfig)
 *   fighters/<id>/portrait.png             square portrait for HUD / menus
 *   arena/floor.png                        tileable floor texture
 *   sfx/<name>.(ogg|mp3|wav)               overrides the synthesized sound of the same name
 */

export const ANIMS = ['idle', 'run', 'cast', 'hit', 'ko'] as const;
export type AnimName = (typeof ANIMS)[number];

/** Frame rate and looping per animation. */
export const ANIM_CONFIG: Record<AnimName, { frameRate: number; loop: boolean }> = {
  idle: { frameRate: 6, loop: true },
  run: { frameRate: 10, loop: true },
  cast: { frameRate: 12, loop: true },
  hit: { frameRate: 12, loop: false },
  ko: { frameRate: 8, loop: false },
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

export interface SheetInfo {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  frames: Record<AnimName, number>;
}

export interface AssetManifest {
  fighters: Record<string, { sheet: SheetInfo | null; portrait: boolean }>;
  floor: boolean;
  /** Sound name → file path relative to public/assets/. */
  sfx: Partial<Record<SfxName, string>>;
}

export const EMPTY_MANIFEST: AssetManifest = { fighters: {}, floor: false, sfx: {} };

export const ASSET_ROOT = 'assets/';
export const fighterSheetKey = (id: string) => `fighter_${id}`;
export const portraitKey = (id: string) => `portrait_${id}`;
export const animKey = (id: string, anim: AnimName) => `${id}_${anim}`;
export const FLOOR_KEY = 'arena_floor';
export const sfxKey = (name: SfxName) => `sfx_${name}`;
