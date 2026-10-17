import Phaser from 'phaser';
import type { Beam, Projectile, Zone } from '../../sim/entities';
import type { Fighter } from '../../sim/Fighter';
import type { SkillDef } from '../../sim/types';
import { add, scale } from '../../sim/vec';
import { EMPTY_MANIFEST, fxKey, type AssetManifest, type FxInfo, type FxPart } from '../assets';
import { ARENA_HEIGHT, ARENA_WIDTH } from '../layout';
import { impactStyle, shade } from '../theme';

const MAX_CRATERS = 18;
const CRATER_LIFETIME = 7000;
/** Custom effects centred on a fighter sit this far above its feet, roughly mid-body. */
const BODY_LIFT = 14;
/** Seconds over which a timed effect on a fighter fades out at the end. */
const FX_FADE = 0.3;

interface Attached {
  sprite: Phaser.GameObjects.Sprite;
  fighter: Fighter;
  alive: () => boolean;
  /** Clock time at which the effect ends, if it is timed (used for the fade-out). */
  endsAt?: number;
}

export interface VfxLayers {
  floor: Phaser.GameObjects.Container;
  zones: Phaser.GameObjects.Container;
  fx: Phaser.GameObjects.Container;
}

/** Everything in the arena that isn't a fighter: projectiles, beams, zones, particles, craters, damage numbers. */
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
  /** Simulation time in seconds, so timed effects follow slow motion instead of wall-clock time. */
  private clock: () => number = () => 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layers: VfxLayers,
  ) {
    this.manifest = (scene.registry.get('manifest') as AssetManifest | undefined) ?? EMPTY_MANIFEST;
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
    layers.fx.add([this.trail, this.beamGfx, this.sparks, this.shards]);
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

  /** Cast sprite on the caster while its skill winds up (looping art stays until the skill fires). */
  cast(f: Fighter, skill: SkillDef): void {
    const info = this.fx(skill.id, 'cast');
    if (!info) return;
    const s = this.createFxSprite(skill.id, 'cast', info, skill.ultimate ? 150 : 90).setPosition(f.pos.x, f.pos.y - BODY_LIFT);
    this.layers.fx.add(s);
    if (info.loop) this.attached.push({ sprite: s, fighter: f, alive: () => f.alive && f.casting?.skill === skill });
    else {
      s.once('animationcomplete', () => s.destroy());
      this.attached.push({ sprite: s, fighter: f, alive: () => s.active });
    }
  }

  /** A skill just went off: muzzle / blink-out sprite at the caster, and a lasting aura for buffs. */
  fired(f: Fighter, skill: SkillDef, x: number, y: number): void {
    this.oneShot(skill.id, 'start', x, y - BODY_LIFT, 100);
    const body = skill.kind === 'buff' ? this.fx(skill.id, 'body') : undefined;
    if (!body) return;
    const duration = Math.max(1, ...(skill.selfEffects ?? []).map((e) => ('duration' in e ? e.duration : 0)));
    const startedAt = this.clock();
    const s = this.createFxSprite(skill.id, 'body', body, 130).setPosition(f.pos.x, f.pos.y - BODY_LIFT);
    this.layers.fx.add(s);
    this.attached.push({ sprite: s, fighter: f, alive: () => f.alive && this.clock() - startedAt < duration, endsAt: startedAt + duration });
  }

  /** Keeps effects attached to fighters following them, and retires the ones that are done. Call every frame. */
  syncAttached(): void {
    for (let i = this.attached.length - 1; i >= 0; i--) {
      const a = this.attached[i];
      if (!a.sprite.active || !a.alive()) {
        a.sprite.destroy();
        this.attached.splice(i, 1);
        continue;
      }
      a.sprite.setPosition(a.fighter.pos.x, a.fighter.pos.y - BODY_LIFT);
      if (a.endsAt !== undefined) a.sprite.setAlpha(Math.min(1, (a.endsAt - this.clock()) / FX_FADE));
    }
  }

  impact(x: number, y: number, radius: number, color: number, skillId?: string): void {
    if (this.oneShot(skillId, 'impact', x, y, Math.max(60, radius * 2.4))) {
      if (radius >= 40) this.crater(x, y, radius * 0.7);
      return;
    }
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
    for (const b of list) {
      const from = b.owner.pos;
      const to = add(from, scale(b.dir, b.length));
      const w = b.halfWidth * 2;
      const wobble = 1 + Math.sin(t * 40) * 0.08;
      g.lineStyle(w * 2.2 * wobble, b.skill.color, 0.25).lineBetween(from.x, from.y, to.x, to.y);
      g.lineStyle(w * 1.2 * wobble, b.skill.color, 0.7).lineBetween(from.x, from.y, to.x, to.y);
      g.lineStyle(w * 0.45, 0xffffff, 0.95).lineBetween(from.x, from.y, to.x, to.y);
      g.fillStyle(b.skill.color, 0.6).fillCircle(from.x, from.y, w * 0.9 * wobble);
      g.fillStyle(0xffffff, 0.9).fillCircle(to.x, to.y, w * 0.55 * wobble);
    }
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
      const body = this.fx(z.skill.id, 'body');
      if (body) {
        let sprite = this.zoneSprites.get(z.id);
        if (!sprite) {
          sprite = this.createFxSprite(z.skill.id, 'body', body, z.radius * 2.3);
          if (z.skill.domain) sprite.setDisplaySize(ARENA_WIDTH, ARENA_HEIGHT);
          this.layers.zones.add(sprite);
          this.zoneSprites.set(z.id, sprite);
        }
        sprite.setPosition(z.skill.domain ? ARENA_WIDTH / 2 : z.pos.x, z.skill.domain ? ARENA_HEIGHT / 2 : z.pos.y).setAlpha(a);
        live.add(z.id);
        continue;
      }
      if (z.skill.domain) {
        // A Domain Expansion paints over the whole arena.
        g.fillStyle(z.skill.color, 0.72 * a).fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
        g.lineStyle(2, 0xffffff, 0.15 * a);
        for (let i = 0; i < 6; i++) {
          const r = ((t * 120 + i * 90) % 540) + 10;
          g.strokeCircle(z.pos.x, z.pos.y, r);
        }
        g.fillStyle(0xffffff, 0.5 * a);
        for (let i = 0; i < 40; i++) {
          // Deterministic star field so it doesn't flicker.
          const sx = (i * 137.5) % ARENA_WIDTH;
          const sy = (i * 71.3 + t * 8) % ARENA_HEIGHT;
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
  }
}
