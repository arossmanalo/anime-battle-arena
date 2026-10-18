import Phaser from 'phaser';
import {
  ANIM_CONFIG,
  ANIMS,
  ASSET_ROOT,
  EMPTY_MANIFEST,
  FLOOR_KEY,
  animKey,
  fighterSheetKey,
  fxKey,
  portraitKey,
  sfxKey,
  type AssetManifest,
  type FxPart,
  type SfxName,
  type SheetInfo,
} from '../assets';
import { GAME_HEIGHT, GAME_WIDTH, fitCamera } from '../layout';
import { COLORS, textStyle } from '../theme';

/**
 * Loads whatever art and audio exist (per public/assets/manifest.json) and builds fighter animations.
 * With an empty manifest it finishes instantly and the game runs on placeholders.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    fitCamera(this.cameras.main);
    void this.loadManifest().then((manifest) => this.loadAssets(manifest));
  }

  /** Missing or malformed manifest (e.g. `vite` run without `npm run assets`) means "no assets", not a crash. */
  private async loadManifest(): Promise<AssetManifest> {
    try {
      const res = await fetch(`${ASSET_ROOT}manifest.json`, { cache: 'no-cache' });
      if (res.ok && res.headers.get('content-type')?.includes('json')) {
        return { ...EMPTY_MANIFEST, ...((await res.json()) as Partial<AssetManifest>) };
      }
    } catch {
      // Fall through to placeholders.
    }
    return EMPTY_MANIFEST;
  }

  private loadAssets(manifest: AssetManifest): void {
    this.registry.set('manifest', manifest);
    const v = manifest.version ? `?v=${manifest.version}` : '';

    for (const [id, f] of Object.entries(manifest.fighters)) {
      const dir = `${ASSET_ROOT}fighters/${id}/`;
      if (f.sheet) {
        this.load.spritesheet(fighterSheetKey(id), `${dir}sheet.png${v}`, {
          frameWidth: f.sheet.frameWidth,
          frameHeight: f.sheet.frameHeight,
        });
      }
      if (f.formSheet) {
        this.load.spritesheet(fighterSheetKey(id, true), `${dir}form/sheet.png${v}`, {
          frameWidth: f.formSheet.frameWidth,
          frameHeight: f.formSheet.frameHeight,
        });
      }
      if (f.portrait) this.load.image(portraitKey(id), `${dir}portrait.png${v}`);
    }
    for (const [id, parts] of Object.entries(manifest.fx ?? {})) {
      for (const [part, info] of Object.entries(parts)) {
        this.load.spritesheet(fxKey(id, part as FxPart), `${ASSET_ROOT}fx/${id}/${part}.png${v}`, {
          frameWidth: info.frameWidth,
          frameHeight: info.frameHeight,
        });
      }
    }
    if (manifest.floor) this.load.image(FLOOR_KEY, `${ASSET_ROOT}arena/floor.png${v}`);
    for (const [name, path] of Object.entries(manifest.sfx)) this.load.audio(sfxKey(name as SfxName), `${ASSET_ROOT}${path}`);

    if (this.load.list.size === 0) {
      this.done(manifest);
      return;
    }

    const bar = this.add.rectangle(GAME_WIDTH / 2 - 150, GAME_HEIGHT / 2, 0, 8, COLORS.ult).setOrigin(0, 0.5);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 304, 12).setStrokeStyle(1, COLORS.border);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 24, 'LOADING', textStyle(14, COLORS.muted)).setOrigin(0.5);
    this.load.on('progress', (p: number) => (bar.width = 300 * p));
    // A broken file shouldn't stop the game; that fighter just keeps its placeholder.
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn(`Asset failed to load: ${file.src}`));
    this.load.once('complete', () => this.done(manifest));
    this.load.start();
  }

  private done(manifest: AssetManifest): void {
    for (const [id, f] of Object.entries(manifest.fighters)) {
      if (f.sheet) this.createAnims(id, f.sheet, false);
      if (f.formSheet) this.createAnims(id, f.formSheet, true);
    }
    for (const [id, parts] of Object.entries(manifest.fx ?? {})) {
      for (const [part, info] of Object.entries(parts)) {
        const key = fxKey(id, part as FxPart);
        if (!this.textures.exists(key)) continue;
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: info.frames - 1 }),
          frameRate: info.frameRate,
          repeat: info.loop ? -1 : 0,
        });
      }
    }
    this.scene.start('MainMenu');
  }

  /** Builds <id>[_form]_<anim> animations: row N of the sheet is ANIMS[N]. Empty rows fall back to idle (attack: to cast). */
  private createAnims(id: string, sheet: SheetInfo, form: boolean): void {
    const key = fighterSheetKey(id, form);
    if (!this.textures.exists(key)) return;
    const row = (i: number, count: number) => this.anims.generateFrameNumbers(key, { start: i * sheet.columns, end: i * sheet.columns + count - 1 });
    const idle = sheet.frames.idle ? row(0, sheet.frames.idle) : this.anims.generateFrameNumbers(key, { start: 0, end: 0 });
    ANIMS.forEach((anim, i) => {
      const count = sheet.frames[anim];
      const cfg = ANIM_CONFIG[anim];
      this.anims.create({
        key: animKey(id, anim, form),
        frames: count ? row(i, count) : anim === 'attack' && sheet.frames.cast ? row(ANIMS.indexOf('cast'), sheet.frames.cast) : idle,
        frameRate: cfg.frameRate,
        repeat: cfg.loop ? -1 : 0,
      });
    });
  }
}
