import Phaser from 'phaser';
import type { Fighter } from '../../sim/Fighter';
import { ANIM_CONFIG, animKey, fighterSheetKey, type AnimName, type AssetManifest } from '../assets';
import { COLORS, hpColor, impactStyle, shade, textStyle } from '../theme';

const BAR_W = 40;
/** How long the hit animation holds after taking damage, in seconds. */
const HIT_ANIM_TIME = 0.18;
/** The swing animation lasts this many times the attack's wind-up, so the strike frame lines up with the hit. */
const ATTACK_ANIM_FACTOR = 2.5;
/** A frame is drawn this many radii wide; the character fills ~75% of it, so it stands taller than its collision circle. */
const SPRITE_SCALE = 5;
/** Fraction of a frame's height the standing character fills (48/64 in the spec). */
const CHARACTER_HEIGHT = 0.75;

/**
 * Draws one fighter: shadow, aura, body (sprite when available, placeholder disc otherwise),
 * overhead HP bar and status markers. Reads sim state every frame; never writes to it.
 */
export class FighterView {
  readonly root: Phaser.GameObjects.Container;
  private readonly aura: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Container;
  private readonly flash: Phaser.GameObjects.Arc;
  private readonly shield: Phaser.GameObjects.Arc;
  private readonly charge: Phaser.GameObjects.Graphics;
  private readonly hpBar: Phaser.GameObjects.Graphics;
  private readonly marker: Phaser.GameObjects.Graphics;
  private markerKind: 'focus' | 'protect' | null = null;
  private readonly status: Phaser.GameObjects.Text;
  private readonly facingMark: Phaser.GameObjects.Triangle;
  private sprite?: Phaser.GameObjects.Sprite;
  /** True while the transformed-form sheet is shown. */
  private formSprites = false;
  private trailTimer = 0;
  private hitTimer = 0;
  private attackTimer = 0;
  private attackDuration = 0.3;
  private wasSwinging = false;
  private koPlayed = false;
  /** Top of the drawn body (sprite head or placeholder disc); overhead UI stacks above it. */
  readonly headY: number;
  /** Centre and half-height of the drawn body, for rings and bubbles that wrap it. */
  private readonly bodyY: number;
  private readonly bodyRadius: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly f: Fighter,
    parent: Phaser.GameObjects.Container,
    isPlayer: boolean,
    /** Team battles: a coloured ring under the fighter and a role tag instead of YOU / CPU. */
    team?: { color: number; tag: string; tagColor: number },
  ) {
    const r = f.def.radius;
    this.root = scene.add.container(f.pos.x, f.pos.y);
    parent.add(this.root);

    const shadow = scene.add.ellipse(0, r * 0.85, r * 2.2, r * 0.8, 0x000000, 0.35);
    const ring = team ? scene.add.ellipse(0, r * 0.85, r * 2.9, r * 1.1).setStrokeStyle(3, team.color, 0.9) : null;
    this.aura = scene.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.charge = scene.add.graphics();

    this.body = scene.add.container(0, 0);
    const key = fighterSheetKey(f.def.id);
    if (scene.textures.exists(key)) {
      // Feet sit on the shadow; see docs/ART_SPEC.md for the frame layout.
      this.sprite = scene.add.sprite(0, r * 0.85, key).setOrigin(0.5, 0.875).setDisplaySize(r * SPRITE_SCALE, r * SPRITE_SCALE);
      this.headY = r * 0.85 - r * SPRITE_SCALE * CHARACTER_HEIGHT;
      this.body.add(this.sprite);
      this.playAnim('idle');
    } else if (f.def.id === 'dummy') {
      // The training dummy: a bullseye ball.
      this.headY = -r - 9;
      this.body.add(scene.add.circle(0, 0, r, f.def.color).setStrokeStyle(3, f.def.accent));
      this.body.add(scene.add.circle(0, 0, r * 0.64, 0xffffff));
      this.body.add(scene.add.circle(0, 0, r * 0.3, f.def.color));
    } else {
      this.headY = -r - 9;
      this.body.add(scene.add.circle(0, 0, r, f.def.color).setStrokeStyle(3, f.def.accent));
      this.body.add(scene.add.circle(-r * 0.3, -r * 0.35, r * 0.28, shade(f.def.color, 0.5), 0.6));
      this.body.add(scene.add.text(0, 1, f.def.initials, impactStyle(13, 0xffffff)).setOrigin(0.5));
    }
    this.facingMark = scene.add.triangle(r + 5, 0, 0, -5, 0, 5, 7, 0, f.def.accent).setStrokeStyle(1, 0xffffff);
    this.flash = scene.add.circle(0, 0, r + 1, 0xffffff, 0.9).setVisible(false);
    // The shield bubble wraps whatever is drawn: the disc, or the full height of a sprite.
    const bodyTop = this.sprite ? this.headY : -r;
    const bodyBottom = this.sprite ? r * 0.85 : r;
    this.bodyY = (bodyTop + bodyBottom) / 2;
    this.bodyRadius = (bodyBottom - bodyTop) / 2;
    this.aura.setY(this.bodyY);
    this.shield = scene.add
      .circle(0, this.bodyY, this.bodyRadius + 7)
      .setStrokeStyle(2, 0x9fd8ff, 0.9)
      .setFillStyle(0x9fd8ff, 0.12)
      .setVisible(false);

    this.hpBar = scene.add.graphics();
    this.marker = scene.add.graphics();
    const tag = scene.add
      .text(0, this.headY - 13, team ? team.tag : f.def.id === 'dummy' ? 'DUMMY' : isPlayer ? 'YOU' : 'CPU', textStyle(9, team ? team.tagColor : isPlayer ? COLORS.energy : COLORS.danger, { fontStyle: 'bold' }))
      .setOrigin(0.5);
    this.status = scene.add.text(0, this.headY - 25, '', textStyle(11, 0xffffff, { fontStyle: 'bold' })).setOrigin(0.5);

    // With a real sprite the art itself shows facing and the hit flash tints the sprite instead.
    if (this.sprite) this.facingMark.setVisible(false);

    this.root.add([...(ring ? [ring] : []), shadow, this.marker, this.aura, this.charge, this.body, this.facingMark, this.flash, this.shield, this.hpBar, tag, this.status]);
  }

  /** Team battles: a crosshair on the enemy your team is told to focus, a shield ring on the ally it protects. */
  setMarker(kind: 'focus' | 'protect' | null): void {
    if (kind === this.markerKind && kind === null) return;
    this.markerKind = kind;
    this.marker.clear();
    if (!kind) return;
    const r = this.bodyRadius + 14;
    const color = kind === 'focus' ? 0xffd23d : 0xffffff;
    this.marker.lineStyle(3, color, 0.95).strokeCircle(0, this.bodyY, r);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + (kind === 'focus' ? Math.PI / 4 : 0);
      const x1 = Math.cos(a) * (r - 6);
      const y1 = Math.sin(a) * (r - 6) + this.bodyY;
      const x2 = Math.cos(a) * (r + 8);
      const y2 = Math.sin(a) * (r + 8) + this.bodyY;
      this.marker.lineBetween(x1, y1, x2, y2);
    }
  }

  /** Whether a skill has a custom effect sprite for this part (so the generic one is skipped). */
  hasFx(skillId: string, part: string): boolean {
    const m = this.scene.registry.get('manifest') as AssetManifest | undefined;
    return !!(m?.fx?.[skillId] as Record<string, unknown> | undefined)?.[part];
  }

  /** True while a custom buff aura sprite is attached to this fighter. */
  private customAura(): boolean {
    return ((this.scene.registry.get('fxAuraUids') as Set<number> | undefined)?.has(this.f.uid)) ?? false;
  }

  private playAnim(anim: AnimName, restart = false): void {
    const key = animKey(this.f.def.id, anim, this.formSprites);
    if (this.sprite && this.scene.anims.exists(key)) this.sprite.play(key, !restart);
  }

  /** Swaps to the transformed sheet (fighters/<id>/form/) when the fighter transforms, if one exists. */
  private syncFormSprites(): void {
    if (!this.sprite) return;
    const want = this.f.transformed && this.scene.textures.exists(fighterSheetKey(this.f.def.id, true));
    if (want === this.formSprites) return;
    const { displayWidth, displayHeight } = this.sprite;
    this.formSprites = want;
    this.sprite.setTexture(fighterSheetKey(this.f.def.id, want), 0).setDisplaySize(displayWidth, displayHeight);
  }

  hitFlash(): void {
    this.hitTimer = HIT_ANIM_TIME;
    if (this.sprite) {
      this.sprite.setTintFill(0xffffff);
      this.scene.time.delayedCall(70, () => this.sprite?.clearTint());
    } else {
      this.flash.setVisible(true).setAlpha(0.9);
      this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: 120, onComplete: () => this.flash.setVisible(false) });
    }
    this.scene.tweens.add({ targets: this.root, scaleX: 1.15, scaleY: 0.85, duration: 50, yoyo: true });
  }

  /** Pulse the body (used for transformations and buff casts). */
  pulse(color: number, skillId?: string): void {
    if (skillId && this.hasFx(skillId, 'body')) return;
    const ring = this.scene.add.circle(0, 0, this.f.def.radius, color, 0).setStrokeStyle(4, color);
    this.root.add(ring);
    this.scene.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
  }

  /**
   * @param animSpeed playback rate for sprite animations: 0 freezes them (hit-stop), below 1 is
   * slow motion. `dt` is already scaled by the caller.
   */
  update(dt: number, trailLayer: Phaser.GameObjects.Container, animSpeed = 1): void {
    const f = this.f;
    this.root.setPosition(f.pos.x, f.pos.y);
    this.root.setDepth(f.pos.y);

    if (!f.alive) {
      this.playKo();
      return;
    }

    // Only real sprites flip; the placeholder keeps its initials readable and uses the facing marker.
    this.sprite?.setFlipX(f.facing < 0);
    this.updateAnim(dt, animSpeed);
    this.facingMark.setX(f.facing * (f.def.radius + 5)).setScale(f.facing, 1);

    // Aura: form colour while transformed, skill colour while buffed.
    // A buff with its own aura sprite replaces the generic red glow.
    const buffed = (f.hasStatus('damageBuff') || f.hasStatus('speedBuff')) && !this.customAura();
    const auraColor = f.form?.color ?? (buffed ? 0xff5050 : 0);
    if (auraColor) {
      const t = this.scene.time.now / 1000;
      this.aura.setVisible(true).setTint(auraColor).setScale(0.55 + Math.sin(t * 9) * 0.05).setAlpha(0.85);
    } else this.aura.setVisible(false);

    this.shield.setVisible(f.hasStatus('shield'));
    this.body.setAlpha(f.invuln > 0 ? 0.6 + Math.sin(this.scene.time.now / 40) * 0.3 : 1);

    // Wind-up ring.
    this.charge.clear();
    if (f.casting && !this.hasFx(f.casting.skill.id, 'cast')) {
      const p = 1 - f.casting.remaining / Math.max(0.01, f.casting.skill.castTime);
      this.charge.lineStyle(3, f.casting.skill.color, 0.9);
      this.charge.beginPath();
      this.charge.arc(0, this.bodyY, this.bodyRadius + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
      this.charge.strokePath();
      if (f.casting.skill.ultimate) {
        this.charge.fillStyle(f.casting.skill.color, 0.15 + 0.25 * p);
        this.charge.fillCircle(0, this.bodyY, this.bodyRadius + 14 + 30 * p);
      }
    }

    // Dash after-images.
    this.trailTimer -= dt;
    if (f.dash && this.trailTimer <= 0 && !this.hasFx(f.dash.skill.id, 'start') && !this.hasFx(f.dash.skill.id, 'impact')) {
      this.trailTimer = 0.025;
      const ghost = this.scene.add.circle(f.pos.x, f.pos.y, f.def.radius, f.dash.skill.color, 0.5);
      trailLayer.add(ghost);
      this.scene.tweens.add({ targets: ghost, alpha: 0, scale: 0.6, duration: 220, onComplete: () => ghost.destroy() });
    }

    // Status text.
    const marks: string[] = [];
    if (f.stunned) marks.push('✦ STUN');
    if (f.hasStatus('burn')) marks.push('BURN');
    if (f.hasStatus('slow')) marks.push('SLOW');
    this.status.setText(marks.join(' '));

    // Overhead HP bar.
    const frac = f.hp / f.maxHp;
    this.hpBar.clear();
    // The dummy can't be hurt, so it gets no health bar.
    if (this.f.def.id !== 'dummy') {
      this.hpBar.fillStyle(0x000000, 0.6).fillRect(-BAR_W / 2 - 1, this.headY - 4, BAR_W + 2, 6);
      this.hpBar.fillStyle(hpColor(frac)).fillRect(-BAR_W / 2, this.headY - 3, BAR_W * frac, 4);
    }
  }

  /**
   * Picks the animation from sim state: hit > cast > run > idle. "Running" comes from the fighter's
   * velocity, not from how far it moved since the last render frame — the sim steps at a fixed 60 Hz,
   * so on high-refresh screens most render frames see no movement and the run cycle would keep restarting.
   */
  private updateAnim(dt: number, animSpeed: number): void {
    const f = this.f;
    this.hitTimer -= dt;
    this.attackTimer -= dt;
    const swingStarted = f.swinging && !this.wasSwinging;
    this.wasSwinging = f.swinging;
    if (swingStarted) {
      this.attackDuration = f.def.attack.windup * ATTACK_ANIM_FACTOR;
      this.attackTimer = this.attackDuration;
    }
    if (!this.sprite) return;
    const running = !f.stunned && !f.channel && Math.hypot(f.vel.x, f.vel.y) > 1;
    let anim: AnimName = 'idle';
    if (this.hitTimer > 0) anim = 'hit';
    else if (f.busy) anim = 'cast';
    else if (this.attackTimer > 0) anim = 'attack';
    else if (running) anim = 'run';
    this.syncFormSprites();
    this.playAnim(anim, anim === 'attack' && swingStarted);
    // The run cycle speeds up and slows down with the fighter (buffs, slows), so feet don't slide.
    const pace = anim === 'run' ? f.speed / f.def.speed : 1;
    let timeScale = animSpeed * pace;
    if (anim === 'attack') {
      // Fit however many frames the row has into the swing's duration.
      const frames = this.sprite.anims.currentAnim?.frames.length ?? 1;
      timeScale *= frames / ANIM_CONFIG.attack.frameRate / this.attackDuration;
    }
    this.sprite.anims.timeScale = timeScale;
  }

  private playKo(): void {
    if (this.koPlayed) return;
    this.koPlayed = true;
    this.hpBar.clear();
    this.charge.clear();
    this.aura.setVisible(false);
    this.shield.setVisible(false);
    this.status.setText('');
    const manifest = this.scene.registry.get('manifest') as AssetManifest | undefined;
    const entry = manifest?.fighters[this.f.def.id];
    const sheet = this.formSprites ? entry?.formSheet : entry?.sheet;
    if (this.sprite && sheet?.frames.ko) {
      this.playAnim('ko');
      this.scene.tweens.add({ targets: this.body, alpha: 0.6, duration: 900 });
    } else {
      this.scene.tweens.add({ targets: this.body, angle: 540, scale: 0.6, alpha: 0.35, duration: 900, ease: 'Cubic.out' });
    }
  }
}
