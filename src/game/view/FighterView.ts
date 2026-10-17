import Phaser from 'phaser';
import type { Fighter } from '../../sim/Fighter';
import { COLORS, hpColor, impactStyle, shade, textStyle } from '../theme';

const BAR_W = 40;

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
  private readonly status: Phaser.GameObjects.Text;
  private readonly facingMark: Phaser.GameObjects.Triangle;
  private sprite?: Phaser.GameObjects.Sprite;
  private trailTimer = 0;
  private koPlayed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly f: Fighter,
    parent: Phaser.GameObjects.Container,
    isPlayer: boolean,
  ) {
    const r = f.def.radius;
    this.root = scene.add.container(f.pos.x, f.pos.y);
    parent.add(this.root);

    const shadow = scene.add.ellipse(0, r * 0.85, r * 2.2, r * 0.8, 0x000000, 0.35);
    this.aura = scene.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.charge = scene.add.graphics();

    this.body = scene.add.container(0, 0);
    const key = `fighter_${f.def.id}`;
    if (scene.textures.exists(key)) {
      this.sprite = scene.add.sprite(0, -r * 0.4, key).setDisplaySize(r * 3.4, r * 3.4);
      this.body.add(this.sprite);
    } else {
      this.body.add(scene.add.circle(0, 0, r, f.def.color).setStrokeStyle(3, f.def.accent));
      this.body.add(scene.add.circle(-r * 0.3, -r * 0.35, r * 0.28, shade(f.def.color, 0.5), 0.6));
      this.body.add(scene.add.text(0, 1, f.def.initials, impactStyle(13, 0xffffff)).setOrigin(0.5));
    }
    this.facingMark = scene.add.triangle(r + 5, 0, 0, -5, 0, 5, 7, 0, f.def.accent).setStrokeStyle(1, 0xffffff);
    this.flash = scene.add.circle(0, 0, r + 1, 0xffffff, 0.9).setVisible(false);
    this.shield = scene.add.circle(0, 0, r + 7).setStrokeStyle(2, 0x9fd8ff, 0.9).setFillStyle(0x9fd8ff, 0.12).setVisible(false);

    this.hpBar = scene.add.graphics();
    const tag = scene.add
      .text(0, -r - 22, isPlayer ? 'YOU' : 'CPU', textStyle(9, isPlayer ? COLORS.energy : COLORS.danger, { fontStyle: 'bold' }))
      .setOrigin(0.5);
    this.status = scene.add.text(0, -r - 34, '', textStyle(11, 0xffffff, { fontStyle: 'bold' })).setOrigin(0.5);

    this.root.add([shadow, this.aura, this.charge, this.body, this.facingMark, this.flash, this.shield, this.hpBar, tag, this.status]);
  }

  hitFlash(): void {
    this.flash.setVisible(true).setAlpha(0.9);
    this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: 120, onComplete: () => this.flash.setVisible(false) });
    this.scene.tweens.add({ targets: this.root, scaleX: 1.15, scaleY: 0.85, duration: 50, yoyo: true });
  }

  /** Pulse the body (used for transformations and buff casts). */
  pulse(color: number): void {
    const ring = this.scene.add.circle(0, 0, this.f.def.radius, color, 0).setStrokeStyle(4, color);
    this.root.add(ring);
    this.scene.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
  }

  update(dt: number, trailLayer: Phaser.GameObjects.Container): void {
    const f = this.f;
    this.root.setPosition(f.pos.x, f.pos.y);
    this.root.setDepth(f.pos.y);

    if (!f.alive) {
      this.playKo();
      return;
    }

    // Only real sprites flip; the placeholder keeps its initials readable and uses the facing marker.
    this.sprite?.setFlipX(f.facing < 0);
    this.facingMark.setX(f.facing * (f.def.radius + 5)).setScale(f.facing, 1);

    // Aura: form colour while transformed, skill colour while buffed.
    const buffed = f.hasStatus('damageBuff') || f.hasStatus('speedBuff');
    const auraColor = f.form?.color ?? (buffed ? 0xff5050 : 0);
    if (auraColor) {
      const t = this.scene.time.now / 1000;
      this.aura.setVisible(true).setTint(auraColor).setScale(0.55 + Math.sin(t * 9) * 0.05).setAlpha(0.85);
    } else this.aura.setVisible(false);

    this.shield.setVisible(f.hasStatus('shield'));
    this.body.setAlpha(f.invuln > 0 ? 0.6 + Math.sin(this.scene.time.now / 40) * 0.3 : 1);

    // Wind-up ring.
    this.charge.clear();
    if (f.casting) {
      const p = 1 - f.casting.remaining / Math.max(0.01, f.casting.skill.castTime);
      this.charge.lineStyle(3, f.casting.skill.color, 0.9);
      this.charge.beginPath();
      this.charge.arc(0, 0, f.def.radius + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
      this.charge.strokePath();
      if (f.casting.skill.ultimate) {
        this.charge.fillStyle(f.casting.skill.color, 0.15 + 0.25 * p);
        this.charge.fillCircle(0, 0, f.def.radius + 14 + 30 * p);
      }
    }

    // Dash after-images.
    this.trailTimer -= dt;
    if (f.dash && this.trailTimer <= 0) {
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
    const r = f.def.radius;
    const frac = f.hp / f.maxHp;
    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.6).fillRect(-BAR_W / 2 - 1, -r - 13, BAR_W + 2, 6);
    this.hpBar.fillStyle(hpColor(frac)).fillRect(-BAR_W / 2, -r - 12, BAR_W * frac, 4);
  }

  private playKo(): void {
    if (this.koPlayed) return;
    this.koPlayed = true;
    this.hpBar.clear();
    this.charge.clear();
    this.aura.setVisible(false);
    this.shield.setVisible(false);
    this.status.setText('');
    this.scene.tweens.add({ targets: this.body, angle: 540, scale: 0.6, alpha: 0.35, duration: 900, ease: 'Cubic.out' });
  }
}
