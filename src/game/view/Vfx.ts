import Phaser from 'phaser';
import type { Beam, Projectile, Zone } from '../../sim/entities';
import type { Fighter } from '../../sim/Fighter';
import type { SkillDef } from '../../sim/types';
import { add, scale } from '../../sim/vec';
import { EMPTY_MANIFEST, FX_PARTS, fxKey, type AssetManifest, type FxInfo, type FxPart } from '../assets';
import { ARENA_HEIGHT, ARENA_WIDTH, ARENA_X, ARENA_Y, GAME_HEIGHT, GAME_WIDTH } from '../layout';
import { impactStyle, shade } from '../theme';

const MAX_CRATERS = 18;
const CRATER_LIFETIME = 7000;
/** Custom effects centred on a fighter sit this far above its feet, roughly mid-body. */
const BODY_LIFT = 14;
/** Seconds over which a timed effect on a fighter fades out at the end. */
const FX_FADE = 0.3;

/** A Domain Expansion with custom art: takes over the whole screen, not just the arena, and opens outward from the caster. */
interface DomainView {
  sprite: Phaser.GameObjects.Sprite;
  vignette: Phaser.GameObjects.Image;
  maskGfx: Phaser.GameObjects.Graphics;
  mask: Phaser.Display.Masks.GeometryMask | null;
  /** scene.time.now when it started opening. */
  start: number;
  baseW: number;
  baseH: number;
}

/** How long the domain takes to open from the caster to the screen edges (ms), and how far past the screen it's drawn. */
const DOMAIN_OPEN_MS = 650;
const DOMAIN_OVERSCAN = 1.25;
const VIGNETTE_KEY = 'fx_domain_vignette';

interface Attached {
  sprite: Phaser.GameObjects.Sprite;
  fighter: Fighter;
  alive: () => boolean;
  /** Clock time at which the effect ends, if it is timed (used for the fade-out). */
  endsAt?: number;
  /** Stays where it was created instead of following the fighter. */
  fixed?: boolean;
  /** A dome standing on the ground around the fighter (art's base sits at the fighter's feet). */
  ground?: boolean;
}

export interface VfxLayers {
  floor: Phaser.GameObjects.Container;
  zones: Phaser.GameObjects.Container;
  fx: Phaser.GameObjects.Container;
}

/** Everything in the arena that isn't a fighter: projectiles, beams, zones, particles, craters, damage numbers. */
/** Buffs, and team-kit skills that only act on the caster (taunt, guard), show their body art as a lasting aura. */
export function isSelfAura(skill: SkillDef): boolean {
  return skill.kind === 'buff' || (skill.kind === 'aoe' && !!skill.selfEffects?.length);
}

export class Vfx {
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly shards: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly trail: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly beamGfx: Phaser.GameObjects.Graphics;
  private readonly zoneGfx: Phaser.GameObjects.Graphics;
  private readonly projectiles = new Map<number, Phaser.GameObjects.Container>();
  private readonly craters: Phaser.GameObjects.Graphics[] = [];
  private readonly manifest: AssetManifest;
  private readonly customProjectiles = new Set<number>();
  private readonly zoneSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private readonly attached: Attached[] = [];
  private readonly beamSprites = new Map<number, Phaser.GameObjects.Sprite[]>();
  private readonly domains = new Map<number, DomainView>();
  private readonly slashGfx: Phaser.GameObjects.Graphics;
  private readonly slashes: { frame: number; x: number; y: number; angle: number; len: number; width: number; born: number; life: number }[] = [];
  private readonly shrines = new Map<number, Phaser.GameObjects.Sprite>();
  private slashAcc = 0;
  /** Simulation time in seconds, so timed effects follow slow motion instead of wall-clock time. */
  private clock: () => number = () => 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layers: VfxLayers,
  ) {
    this.manifest = (scene.registry.get('manifest') as AssetManifest | undefined) ?? EMPTY_MANIFEST;
    this.auraUids().clear();
    this.zoneGfx = scene.add.graphics();
    layers.zones.add(this.zoneGfx);

    this.sparks = scene.add.particles(0, 0, 'spark', {
      speed: { min: 80, max: 320 },
      lifespan: { min: 250, max: 600 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    });
    this.shards = scene.add.particles(0, 0, 'shard', {
      speed: { min: 120, max: 380 },
      lifespan: { min: 300, max: 700 },
      rotate: { min: 0, max: 360 },
      scale: { start: 1, end: 0.3 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    });
    this.trail = scene.add.particles(0, 0, 'spark', {
      lifespan: 280,
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.7, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    });
    this.beamGfx = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.slashGfx = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    layers.fx.add([this.trail, this.beamGfx, this.sparks, this.shards, this.slashGfx]);
  }

  /** Arena size in sim units and how much the world container is scaled down on screen (team battles use bigger arenas). */
  private view = { arenaW: ARENA_WIDTH, arenaH: ARENA_HEIGHT, scale: 1, team: false };

  /** `team`: a team battle, where domains cover a circle around the caster instead of the whole screen. */
  setView(arenaW: number, arenaH: number, scale: number, team = false): void {
    this.view = { arenaW, arenaH, scale, team };
  }

  /** The whole game screen, in world (arena) coordinates. */
  private screenRect(): { x: number; y: number; w: number; h: number } {
    const s = this.view.scale;
    return { x: -ARENA_X / s, y: -ARENA_Y / s, w: GAME_WIDTH / s, h: GAME_HEIGHT / s };
  }

  setClock(clock: () => number): void {
    this.clock = clock;
  }

  // ---- custom effect sprites (public/assets/fx/<skill id>/<part>.png) ------------------------------

  /** The loaded custom sprite for a skill's part, if there is one. */
  private fx(id: string | undefined, part: FxPart): FxInfo | undefined {
    const info = id ? this.manifest.fx?.[id]?.[part] : undefined;
    return info && id && this.scene.anims.exists(fxKey(id, part)) ? info : undefined;
  }

  hasFx(id: string | undefined, part: FxPart): boolean {
    return !!this.fx(id, part);
  }

  hasAnyFx(id: string | undefined): boolean {
    return FX_PARTS.some((p) => this.hasFx(id, p));
  }

  /** Creates (but doesn't parent) a sprite playing a part's animation. `size` is the default width in arena px. */
  private createFxSprite(id: string, part: FxPart, info: FxInfo, size: number): Phaser.GameObjects.Sprite {
    const width = info.size ?? size;
    const s = this.scene.add.sprite(0, 0, fxKey(id, part)).setDisplaySize(width, (width * info.frameHeight) / info.frameWidth);
    if (info.blend === 'add') s.setBlendMode(Phaser.BlendModes.ADD);
    s.play(fxKey(id, part));
    return s;
  }

  /** Plays a part once at a point and removes it. Returns false if there is no such sprite. */
  private oneShot(id: string | undefined, part: FxPart, x: number, y: number, size: number): boolean {
    const info = this.fx(id, part);
    if (!info || !id) return false;
    const s = this.createFxSprite(id, part, info, size).setPosition(x, y);
    // Looping art would never finish, so also stop it after one pass.
    s.once('animationcomplete', () => s.destroy());
    s.once('animationrepeat', () => s.destroy());
    this.layers.fx.add(s);
    return true;
  }

  /** Cast sprite on the caster during the wind-up. Plays (or loops) until the skill fires, then goes. */
  cast(f: Fighter, skill: SkillDef): void {
    // A slash domain's shrine rises out of the floor during the wind-up (the same sprite that then stands for the domain).
    const standing = skill.domainStyle === 'slashes' ? this.fx(skill.id, 'body') : undefined;
    if (standing) {
      const w = standing.size ?? 330;
      const h = (w * standing.frameHeight) / standing.frameWidth;
      const s = this.scene.add.sprite(f.pos.x, f.pos.y + 30, fxKey(skill.id, 'body'), 0).setOrigin(0.5, 0.82).setDisplaySize(w, h).setAlpha(0);
      s.play(fxKey(skill.id, 'body'));
      if (standing.blend === 'add') s.setBlendMode(Phaser.BlendModes.ADD);
      this.layers.zones.add(s);
      const total = Math.max(0.05, skill.castTime);
      this.attached.push({
        sprite: s,
        fighter: f,
        alive: () => {
          const left = f.casting?.skill === skill ? f.casting.remaining : 0;
          const p = 1 - left / total;
          s.setAlpha(Math.min(1, p * 1.4)).setDisplaySize(w * (0.55 + 0.45 * Math.min(1, p * 1.2)), h * (0.55 + 0.45 * Math.min(1, p * 1.2)));
          return f.alive && f.casting?.skill === skill;
        },
        fixed: true,
      });
      return;
    }
    const info = this.fx(skill.id, 'cast');
    if (!info) return;
    const s = this.createFxSprite(skill.id, 'cast', info, skill.ultimate ? 150 : 90).setPosition(f.pos.x, f.pos.y - BODY_LIFT);
    this.layers.fx.add(s);
    // Looping art repeats and one-shot art holds its last frame; either way it stays until the skill fires.
    this.attached.push({ sprite: s, fighter: f, alive: () => f.alive && f.casting?.skill === skill });
  }

  /** A skill just went off: muzzle / blink-out sprite at the caster, and a lasting aura for buffs. */
  fired(f: Fighter, skill: SkillDef, x: number, y: number): void {
    this.oneShot(skill.id, 'start', x, y - BODY_LIFT, 100);
    // A support skill puts its aura on each teammate it reaches (see supportAura), not just the caster.
    const body = isSelfAura(skill) && !skill.support ? this.fx(skill.id, 'body') : undefined;
    if (!body) return;
    this.attachAura(f, skill.id, body, Math.max(1, ...(skill.selfEffects ?? []).map((e) => ('duration' in e ? e.duration : 0))));
  }

  /** A support skill reached `f`: wear the skill's looping aura art for `duration` seconds. */
  supportAura(f: Fighter, skillId: string, duration: number): void {
    const body = this.fx(skillId, 'body');
    if (body) this.attachAura(f, skillId, body, duration);
  }

  private attachAura(f: Fighter, skillId: string, body: FxInfo, duration: number): void {
    const startedAt = this.clock();
    const s = this.createFxSprite(skillId, 'body', body, 130).setPosition(f.pos.x, f.pos.y - BODY_LIFT);
    (body.behind ? this.layers.zones : this.layers.fx).add(s);
    if (body.ground) s.setOrigin(0.5, 0.93);
    const auras = this.auraUids();
    auras.add(f.uid);
    this.attached.push({
      ground: body.ground,
      sprite: s,
      fighter: f,
      alive: () => {
        const on = f.alive && this.clock() - startedAt < duration;
        if (!on) auras.delete(f.uid);
        return on;
      },
      endsAt: startedAt + duration,
    });
  }

  /** uids of fighters wearing a custom buff aura; the generic red aura steps aside for them. */
  private auraUids(): Set<number> {
    let set = this.scene.registry.get('fxAuraUids') as Set<number> | undefined;
    if (!set) {
      set = new Set();
      this.scene.registry.set('fxAuraUids', set);
    }
    return set;
  }

  /** Keeps effects attached to fighters following them, and retires the ones that are done. Call every frame. */
  syncAttached(): void {
    for (let i = this.attached.length - 1; i >= 0; i--) {
      const a = this.attached[i];
      if (!a.sprite.active || !a.alive()) {
        if (a.endsAt !== undefined) this.auraUids().delete(a.fighter.uid);
        a.sprite.destroy();
        this.attached.splice(i, 1);
        continue;
      }
      if (a.ground) a.sprite.setPosition(a.fighter.pos.x, a.fighter.pos.y + a.fighter.def.radius + 8);
      else if (!a.fixed) a.sprite.setPosition(a.fighter.pos.x, a.fighter.pos.y - BODY_LIFT);
      if (a.endsAt !== undefined) a.sprite.setAlpha(Math.min(1, (a.endsAt - this.clock()) / FX_FADE));
    }
  }

  /** `support`: a hit on a teammate; skills with custom art but no impact part draw nothing generic there. */
  impact(x: number, y: number, radius: number, color: number, skillId?: string, support = false): void {
    if (this.oneShot(skillId, 'impact', x, y, Math.max(60, radius * 2.4))) {
      if (radius >= 40) this.crater(x, y, radius * 0.7);
      return;
    }
    if (support && this.hasAnyFx(skillId)) return;
    const count = Math.min(60, Math.round(8 + radius / 2));
    this.sparks.setParticleTint(color);
    this.sparks.explode(count, x, y);
    this.shards.setParticleTint(shade(color, 0.4));
    this.shards.explode(Math.round(count / 3), x, y);

    const ring = this.scene.add.circle(x, y, Math.max(8, radius * 0.4), color, 0).setStrokeStyle(3, color);
    this.layers.fx.add(ring);
    this.scene.tweens.add({
      targets: ring,
      scale: radius / Math.max(8, radius * 0.4),
      alpha: 0,
      duration: 350,
      ease: 'Cubic.out',
      onComplete: () => ring.destroy(),
    });

    if (radius >= 40) this.crater(x, y, radius * 0.7);
  }

  /** Burst used for buffs and transformations. */
  aura(x: number, y: number, color: number): void {
    this.sparks.setParticleTint(color);
    this.sparks.explode(30, x, y);
  }

  private crater(x: number, y: number, r: number): void {
    const g = this.scene.add.graphics({ x, y });
    g.fillStyle(0x000000, 0.35).fillEllipse(0, 0, r * 2, r * 1.4);
    g.fillStyle(0x000000, 0.25).fillEllipse(0, 0, r * 1.2, r * 0.8);
    // Radial cracks.
    g.lineStyle(2, 0x000000, 0.4);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + Math.random() * 0.4;
      const len = r * (0.9 + Math.random() * 0.6);
      g.lineBetween(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.3, Math.cos(a) * len, Math.sin(a) * len * 0.7);
    }
    this.layers.floor.add(g);
    this.craters.push(g);
    if (this.craters.length > MAX_CRATERS) this.craters.shift()?.destroy();
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      delay: CRATER_LIFETIME,
      duration: 1500,
      onComplete: () => {
        const i = this.craters.indexOf(g);
        if (i >= 0) this.craters.splice(i, 1);
        g.destroy();
      },
    });
  }

  damageNumber(x: number, y: number, damage: number, color: number): void {
    if (damage <= 0) return;
    const big = damage >= 20;
    const t = this.scene.add
      .text(x + Phaser.Math.Between(-10, 10), y - 24, String(Math.round(damage)), impactStyle(big ? 26 : 16, big ? 0xffe066 : 0xffffff, shade(color, -0.6)))
      .setOrigin(0.5)
      .setDepth(10_000);
    this.layers.fx.add(t);
    this.scene.tweens.add({ targets: t, y: t.y - 34, alpha: 0, scale: big ? 1.3 : 1, duration: 750, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  /** Floating green "+N" over a fighter that was healed. */
  healNumber(x: number, y: number, amount: number): void {
    const t = this.scene.add
      .text(x + Phaser.Math.Between(-10, 10), y - 34, `+${Math.round(amount)}`, impactStyle(amount >= 30 ? 22 : 16, 0x7dff9a, 0x0a3d1a))
      .setOrigin(0.5)
      .setDepth(10_000);
    this.layers.fx.add(t);
    this.scene.tweens.add({ targets: t, y: t.y - 36, alpha: 0, duration: 800, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  syncProjectiles(list: Projectile[]): void {
    const seen = new Set<number>();
    for (const p of list) {
      seen.add(p.id);
      let view = this.projectiles.get(p.id);
      const body = !view ? this.fx(p.skill.id, 'body') : undefined;
      if (!view && body) {
        const sprite = this.createFxSprite(p.skill.id, 'body', body, Math.max(24, p.radius * 4.5));
        view = this.scene.add.container(p.pos.x, p.pos.y, [sprite]);
        view.rotation = body.rotate ? Math.atan2(p.vel.y, p.vel.x) : 0;
        this.layers.fx.add(view);
        this.projectiles.set(p.id, view);
        this.customProjectiles.add(p.id);
      }
      if (!view) {
        const glow = this.scene.add.image(0, 0, 'glow').setTint(p.skill.color).setBlendMode(Phaser.BlendModes.ADD);
        glow.setScale((p.radius * 3.2) / 128);
        const core = this.scene.add.circle(0, 0, p.radius, 0xffffff).setStrokeStyle(Math.max(2, p.radius / 3), p.skill.color);
        view = this.scene.add.container(p.pos.x, p.pos.y, [glow, core]);
        this.layers.fx.add(view);
        this.projectiles.set(p.id, view);
      }
      view.setPosition(p.pos.x, p.pos.y);
      if (p.radius >= 12 && !this.customProjectiles.has(p.id)) {
        view.rotation += 0.3;
        this.trail.setParticleTint(p.skill.color);
        this.trail.emitParticleAt(p.pos.x, p.pos.y, 1);
      }
    }
    for (const [id, view] of this.projectiles) {
      if (!seen.has(id)) {
        view.destroy();
        this.projectiles.delete(id);
        this.customProjectiles.delete(id);
      }
    }
  }

  drawBeams(list: Beam[]): void {
    const g = this.beamGfx;
    g.clear();
    const t = this.scene.time.now / 1000;
    const live = new Set<number>();
    for (const b of list) {
      const from = b.owner.pos;
      const to = add(from, scale(b.dir, b.length));
      const w = b.halfWidth * 2;
      if (this.drawCustomBeam(b, live)) continue;
      const wobble = 1 + Math.sin(t * 40) * 0.08;
      g.lineStyle(w * 2.2 * wobble, b.skill.color, 0.25).lineBetween(from.x, from.y, to.x, to.y);
      g.lineStyle(w * 1.2 * wobble, b.skill.color, 0.7).lineBetween(from.x, from.y, to.x, to.y);
      g.lineStyle(w * 0.45, 0xffffff, 0.95).lineBetween(from.x, from.y, to.x, to.y);
      g.fillStyle(b.skill.color, 0.6).fillCircle(from.x, from.y, w * 0.9 * wobble);
      g.fillStyle(0xffffff, 0.9).fillCircle(to.x, to.y, w * 0.55 * wobble);
    }
    for (const [id, sprites] of this.beamSprites) {
      if (live.has(id)) continue;
      sprites.forEach((s) => s.destroy());
      this.beamSprites.delete(id);
    }
  }

  /** Draws a beam from its custom sprites (body stretched along it, muzzle and tip at the ends). False if it has none. */
  private drawCustomBeam(b: Beam, live: Set<number>): boolean {
    const id = b.skill.id;
    const body = this.fx(id, 'body');
    if (!body) return false;
    let sprites = this.beamSprites.get(b.id);
    const thickness = body.size ?? b.halfWidth * 2 * 2.2;
    if (!sprites) {
      const made = [this.createFxSprite(id, 'body', body, thickness).setOrigin(0, 0.5)];
      for (const part of ['muzzle', 'tip'] as const) {
        const info = this.fx(id, part);
        if (info) made.push(this.createFxSprite(id, part, info, thickness * 1.3));
      }
      sprites = made;
      made.forEach((s) => this.layers.fx.add(s));
      this.beamSprites.set(b.id, sprites);
    }
    live.add(b.id);
    const elapsed = (b.skill.duration ?? 1) - b.remaining;
    const grow = Math.min(1, elapsed / 0.12);
    const fade = Math.min(1, b.remaining / 0.4);
    const alpha = fade * fade * (3 - 2 * fade);
    const length = b.length * grow;
    const from = b.owner.pos;
    const angle = Math.atan2(b.dir.y, b.dir.x);
    const [main, ...ends] = sprites;
    main.setPosition(from.x, from.y).setRotation(angle).setDisplaySize(Math.max(1, length), thickness * (0.55 + 0.45 * fade)).setAlpha(alpha);
    // Muzzle sits on the caster, tip rides the far end of the beam.
    for (const end of ends) {
      const isTip = end.texture.key.endsWith('_tip');
      const p = isTip ? add(from, scale(b.dir, length)) : from;
      end.setPosition(p.x, p.y).setRotation(angle).setAlpha(alpha);
    }
    return true;
  }

  drawZones(list: Zone[]): void {
    const g = this.zoneGfx;
    g.clear();
    const t = this.scene.time.now / 1000;
    const live = new Set<number>();
    for (const z of list) {
      const fadeIn = Math.min(1, ((z.skill.duration ?? 1) - z.remaining) * 5);
      const fadeOut = Math.min(1, z.remaining * 3);
      const a = fadeIn * fadeOut;
      if (z.skill.domainStyle === 'slashes') {
        this.drawSlashDomain(z, a);
        live.add(z.id);
        continue;
      }
      const body = this.fx(z.skill.id, 'body');
      if (body && z.skill.domain) {
        this.drawDomain(z, body, fadeOut, g);
        live.add(z.id);
        continue;
      }
      if (body) {
        let sprite = this.zoneSprites.get(z.id);
        if (!sprite) {
          sprite = this.createFxSprite(z.skill.id, 'body', body, z.radius * 2.3);
          if (z.skill.domain) sprite.setDisplaySize(this.view.arenaW, this.view.arenaH);
          this.layers.zones.add(sprite);
          this.zoneSprites.set(z.id, sprite);
        }
        sprite.setPosition(z.skill.domain ? this.view.arenaW / 2 : z.pos.x, z.skill.domain ? this.view.arenaH / 2 : z.pos.y).setAlpha(a);
        live.add(z.id);
        continue;
      }
      if (z.skill.domain && this.view.team) {
        // Team battle: a lit circle around the caster, with a ring at its edge.
        g.fillStyle(z.skill.color, 0.5 * a).fillCircle(z.pos.x, z.pos.y, z.radius);
        g.lineStyle(4, 0xffffff, 0.5 * a).strokeCircle(z.pos.x, z.pos.y, z.radius);
        continue;
      }
      if (z.skill.domain) {
        // A Domain Expansion paints over the whole screen, not just the arena.
        const sr = this.screenRect();
        g.fillStyle(z.skill.color, 0.72 * a).fillRect(sr.x, sr.y, sr.w, sr.h);
        g.lineStyle(2, 0xffffff, 0.15 * a);
        for (let i = 0; i < 6; i++) {
          const r = ((t * 120 + i * 90) % 540) + 10;
          g.strokeCircle(z.pos.x, z.pos.y, r);
        }
        g.fillStyle(0xffffff, 0.5 * a);
        for (let i = 0; i < 40; i++) {
          // Deterministic star field so it doesn't flicker.
          const sx = (i * 137.5) % this.view.arenaW;
          const sy = (i * 71.3 + t * 8) % this.view.arenaH;
          g.fillCircle(sx, sy, 1 + (i % 3));
        }
        continue;
      }
      const pulse = 1 + Math.sin(t * 8) * 0.04;
      g.fillStyle(z.skill.color, 0.28 * a).fillCircle(z.pos.x, z.pos.y, z.radius * pulse);
      g.lineStyle(3, shade(z.skill.color, 0.5), 0.8 * a).strokeCircle(z.pos.x, z.pos.y, z.radius * pulse);
      g.lineStyle(2, shade(z.skill.color, 0.3), 0.5 * a);
      for (let i = 0; i < 3; i++) {
        const ang = t * 3 + (i * Math.PI * 2) / 3;
        g.beginPath();
        g.arc(z.pos.x, z.pos.y, z.radius * 0.6, ang, ang + 1.2);
        g.strokePath();
      }
    }
    // Custom zone sprites whose zone has ended.
    for (const [id, sprite] of this.zoneSprites) {
      if (live.has(id)) continue;
      sprite.destroy();
      this.zoneSprites.delete(id);
    }
    for (const [id, sprite] of this.shrines) {
      if (live.has(id)) continue;
      sprite.destroy();
      this.shrines.delete(id);
    }
    if (!list.some((z) => z.skill.domainStyle === 'slashes')) {
      // The domain ended (or its caster was knocked out mid-domain): clear every slash, drawn or sprite.
      this.slashes.length = 0;
      this.slashGfx.clear();
      for (const img of this.slashPool) img.setVisible(false);
    }
    for (const [id, d] of this.domains) {
      if (live.has(id)) continue;
      this.destroyDomain(d);
      this.domains.delete(id);
    }
  }

  /**
   * A slash domain: the screen darkens to crimson, a shrine stands up where the caster is, and thin red-white cuts
   * flash across the whole screen from every direction until the final blow.
   */
  private drawSlashDomain(z: Zone, a: number): void {
    const g = this.zoneGfx;
    const team = this.view.team;
    if (team) {
      g.fillStyle(0x2a040c, 0.5 * a).fillCircle(z.pos.x, z.pos.y, z.radius);
      g.lineStyle(4, 0xe01838, 0.6 * a).strokeCircle(z.pos.x, z.pos.y, z.radius);
    } else {
      const sr = this.screenRect();
      g.fillStyle(0x2a040c, 0.55 * a).fillRect(sr.x, sr.y, sr.w, sr.h);
    }
    const id = z.skill.id;
    const loopInfo = this.fx(id, 'body');
    const castInfo = loopInfo ?? this.fx(id, 'cast');
    let shrine = this.shrines.get(z.id);
    if (!shrine && castInfo) {
      const part = loopInfo ? 'body' : 'cast';
      shrine = this.scene.add.sprite(z.owner.pos.x, z.owner.pos.y + 30, fxKey(id, part), loopInfo ? 0 : castInfo.frames - 1);
      const w = (castInfo.size ?? 200) * (team ? 0.7 : 1);
      shrine.setOrigin(0.5, 0.82).setDisplaySize(loopInfo ? w : w * 1.7, (loopInfo ? w : w * 1.7) * castInfo.frameHeight / castInfo.frameWidth);
      if (loopInfo) shrine.play(fxKey(id, 'body'));
      if (castInfo.blend === 'add') shrine.setBlendMode(Phaser.BlendModes.ADD);
      this.layers.zones.add(shrine);
      this.shrines.set(z.id, shrine);
    }
    shrine?.setAlpha(a);
    const now = this.scene.time.now / 1000;
    // Spawn cuts at a steady rate, anywhere on screen, at any angle.
    this.slashAcc += 1 / 60;
    const rate = team ? 90 : 180;
    while (this.slashAcc >= 1 / rate) {
      this.slashAcc -= 1 / rate;
      // Whole screen normally; inside the domain's circle in a team battle.
      const ang = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * z.radius;
      this.slashes.push({
        frame: Math.floor(Math.random() * 99),
        x: team ? z.pos.x + Math.cos(ang) * rr : this.screenRect().x + Math.random() * this.screenRect().w,
        y: team ? z.pos.y + Math.sin(ang) * rr : this.screenRect().y + Math.random() * this.screenRect().h,
        angle: Math.random() * Math.PI,
        len: team ? 120 + Math.random() * 260 : 260 + Math.random() * 620,
        width: 1.5 + Math.random() * 2.5,
        born: now,
        life: 0.18 + Math.random() * 0.3,
      });
    }
    const sg = this.slashGfx;
    sg.clear();
    const slashInfo = this.fx(id, 'slash');
    const keep = new Set<Phaser.GameObjects.Image>();
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      const age = (now - s.born) / s.life;
      if (age >= 1) {
        this.slashes.splice(i, 1);
        continue;
      }
      if (slashInfo) {
        // Sprite slash: one of the supplied cuts, stretched along its length, fading out.
        const img = this.slashImage(i, s.frame % slashInfo.frames, id);
        const grow = Math.min(1, age * 5);
        const k = Math.min(1, (1 - age) * 1.6) * a;
        img.setPosition(s.x, s.y).setRotation(s.angle).setAlpha(k).setDisplaySize(s.len * grow + 1, (s.len * grow + 1) * (slashInfo.frameHeight / slashInfo.frameWidth));
        keep.add(img);
        continue;
      }
      const grow = Math.min(1, age * 5);
      const k = Math.min(1, (1 - age) * 1.6) * a;
      const dx = Math.cos(s.angle) * s.len * 0.5 * grow;
      const dy = Math.sin(s.angle) * s.len * 0.5 * grow;
      sg.lineStyle(s.width * 5, 0xe01838, 0.6 * k).lineBetween(s.x - dx, s.y - dy, s.x + dx, s.y + dy);
      sg.lineStyle(s.width * 1.3, 0xffffff, 1 * k).lineBetween(s.x - dx, s.y - dy, s.x + dx, s.y + dy);
    }
    for (const img of this.slashPool) img.setVisible(keep.has(img));
  }

  private readonly slashPool: Phaser.GameObjects.Image[] = [];
  /** A pooled image for slash number `slot`, showing frame `frame` of the skill's slash sheet. */
  private slashImage(slot: number, frame: number, id: string): Phaser.GameObjects.Image {
    let img = this.slashPool[slot];
    if (!img) {
      img = this.scene.add.image(0, 0, fxKey(id, 'slash'), frame).setBlendMode(Phaser.BlendModes.ADD);
      this.layers.fx.add(img);
      this.slashPool[slot] = img;
    }
    img.setFrame(frame);
    return img;
  }

  /** A soft dark-edged vignette, generated once. */
  private vignetteTexture(): string {
    if (!this.scene.textures.exists(VIGNETTE_KEY)) {
      const tex = this.scene.textures.createCanvas(VIGNETTE_KEY, 512, 288);
      if (tex) {
        const ctx = tex.getContext();
        const grad = ctx.createRadialGradient(256, 144, 60, 256, 144, 300);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.55, 'rgba(8,4,24,0.25)');
        grad.addColorStop(1, 'rgba(4,0,16,0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 288);
        tex.refresh();
      }
    }
    return VIGNETTE_KEY;
  }

  /**
   * The domain: custom art covering the whole screen (the HUD sits above it), revealed by a circle that opens out from
   * the caster with a bright rim, then slowly breathing, darkened at the edges, and fading out at the end.
   */
  private drawDomain(z: Zone, info: FxInfo, fadeOut: number, g: Phaser.GameObjects.Graphics): void {
    let d = this.domains.get(z.id);
    if (!d) {
      const sprite = this.createFxSprite(z.skill.id, 'body', info, GAME_WIDTH);
      // Cover the screen without squashing the art, with margin for camera pans and zooms.
      const sw = this.screenRect();
      const dia = z.radius * 2.1;
      const cover = this.view.team ? Math.max(dia / info.frameWidth, dia / info.frameHeight) : Math.max((sw.w * DOMAIN_OVERSCAN) / info.frameWidth, (sw.h * DOMAIN_OVERSCAN) / info.frameHeight);
      const baseW = info.frameWidth * cover;
      const baseH = info.frameHeight * cover;
      sprite.setDisplaySize(baseW, baseH);
      const vignette = this.scene.add.image(0, 0, this.vignetteTexture()).setDisplaySize(this.view.team ? z.radius * 2.1 : this.screenRect().w * DOMAIN_OVERSCAN, this.view.team ? z.radius * 2.1 : this.screenRect().h * DOMAIN_OVERSCAN);
      const maskGfx = this.scene.make.graphics({}, false);
      const mask = new Phaser.Display.Masks.GeometryMask(this.scene, maskGfx);
      sprite.setMask(mask);
      vignette.setMask(mask);
      this.layers.zones.add([sprite, vignette]);
      d = { sprite, vignette, maskGfx, mask, start: this.scene.time.now, baseW, baseH };
      this.domains.set(z.id, d);
    }
    // Screen centre in the world container's coordinates.
    const sr = this.screenRect();
    const team = this.view.team;
    const cx = team ? z.pos.x : sr.x + sr.w / 2;
    const cy = team ? z.pos.y : sr.y + sr.h / 2;
    const t = (this.scene.time.now - d.start) / DOMAIN_OPEN_MS;
    const open = Math.min(1, t);
    const eased = 1 - Math.pow(1 - open, 3);
    const origin = z.owner.pos;
    const maxR = team ? z.radius : Math.hypot(GAME_WIDTH, GAME_HEIGHT) * 1.1;
    const radius = eased * maxR;
    if (d.mask) {
      const mx = team ? z.pos.x : origin.x;
      const my = team ? z.pos.y : origin.y;
      d.maskGfx.clear().fillStyle(0xffffff).fillCircle(ARENA_X + mx * this.view.scale, ARENA_Y + my * this.view.scale, radius * this.view.scale);
      // A team domain stays clipped to its circle for its whole life.
      if (open >= 1 && !team) {
        d.sprite.clearMask(true);
        d.vignette.clearMask(false);
        d.maskGfx.destroy();
        d.mask = null;
      }
    }
    const breathe = 1 + Math.sin(this.scene.time.now / 1100) * 0.025;
    d.sprite.setPosition(cx, cy).setDisplaySize(d.baseW * breathe, d.baseH * breathe).setAlpha(fadeOut);
    d.vignette.setPosition(cx, cy).setAlpha(fadeOut);
    // Bright rim on the opening edge, and a soft flash at the caster.
    if (team) g.lineStyle(4, 0xffffff, 0.45 * fadeOut).strokeCircle(z.pos.x, z.pos.y, z.radius);
    if (open < 1) {
      g.lineStyle(10, 0xffffff, 0.85 * (1 - open)).strokeCircle(origin.x, origin.y, radius);
      g.lineStyle(26, z.skill.color === 0x14092e ? 0x9a86ff : z.skill.color, 0.35 * (1 - open)).strokeCircle(origin.x, origin.y, radius);
    }
  }

  private destroyDomain(d: DomainView): void {
    d.sprite.destroy();
    d.vignette.destroy();
    if (d.mask) d.maskGfx.destroy();
  }
}
