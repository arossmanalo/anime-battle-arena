import Phaser from 'phaser';
import type { Fighter } from '../../sim/Fighter';
import type { CastFailReason, SkillSlot } from '../../sim/types';
import { GAME_WIDTH } from '../layout';
import { COLORS, hex, impactStyle, shade, textStyle } from '../theme';

const SLOT_W = 96;
const SLOT_H = 66;
const GAP = 8;
const Y = 490;

export type BarAction = { kind: 'skill'; slot: SkillSlot } | { kind: 'transform' } | { kind: 'auto' };

interface SlotView {
  action: BarAction;
  bg: Phaser.GameObjects.Rectangle;
  name: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
  cd: Phaser.GameObjects.Text;
  shade: Phaser.GameObjects.Rectangle;
  key: string;
}

const FAIL_TEXT: Record<CastFailReason, string> = {
  cooldown: 'On cooldown',
  energy: 'Not enough energy',
  busy: 'Busy',
  stunned: 'Stunned!',
  dead: '',
  unavailable: 'Not available yet',
};

/** The player's skill buttons along the bottom: 1-4, ultimate, transform and the Auto toggle. */
export class SkillBar {
  private readonly slots: SlotView[] = [];
  private readonly toast: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly f: Fighter,
    parent: Phaser.GameObjects.Container,
    onAction: (a: BarAction) => void,
  ) {
    const actions: { action: BarAction; key: string }[] = [
      ...([0, 1, 2, 3] as const).map((slot) => ({ action: { kind: 'skill', slot } as BarAction, key: String(slot + 1) })),
      { action: { kind: 'skill', slot: 4 }, key: 'U' },
      ...(f.def.form ? [{ action: { kind: 'transform' } as BarAction, key: 'T' }] : []),
      { action: { kind: 'auto' }, key: 'A' },
    ];
    const total = actions.length * SLOT_W + (actions.length - 1) * GAP;
    let x = (GAME_WIDTH - total) / 2 + SLOT_W / 2;

    for (const { action, key } of actions) {
      const bg = scene.add
        .rectangle(x, Y, SLOT_W, SLOT_H, COLORS.panel)
        .setStrokeStyle(2, COLORS.border)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => onAction(action));
      bg.on('pointerover', () => bg.setFillStyle(COLORS.panelLight));
      bg.on('pointerout', () => bg.setFillStyle(COLORS.panel));
      const keyBadge = scene.add.rectangle(x - SLOT_W / 2 + 10, Y - SLOT_H / 2 + 10, 16, 16, 0x000000, 0.7);
      const keyText = scene.add.text(keyBadge.x, keyBadge.y, key, impactStyle(12)).setOrigin(0.5);
      const name = scene.add
        .text(x, Y - 4, '', textStyle(11, COLORS.text, { align: 'center', fontStyle: 'bold', wordWrap: { width: SLOT_W - 8 } }))
        .setOrigin(0.5);
      const cost = scene.add.text(x, Y + SLOT_H / 2 - 9, '', textStyle(10, COLORS.energy)).setOrigin(0.5);
      const shadeRect = scene.add.rectangle(x, Y - SLOT_H / 2, SLOT_W - 4, SLOT_H - 4, 0x000000, 0.6).setOrigin(0.5, 0);
      const cd = scene.add.text(x, Y, '', impactStyle(22)).setOrigin(0.5);
      parent.add([bg, keyBadge, keyText, name, cost, shadeRect, cd]);
      this.slots.push({ action, bg, name, cost, cd, shade: shadeRect, key });
      x += SLOT_W + GAP;
    }

    this.toast = scene.add.text(GAME_WIDTH / 2, Y - SLOT_H / 2 - 14, '', textStyle(13, COLORS.danger, { fontStyle: 'bold' })).setOrigin(0.5);
    parent.add(this.toast);
  }

  flashFail(action: BarAction, reason: CastFailReason): void {
    const slot = this.slots.find((s) => JSON.stringify(s.action) === JSON.stringify(action));
    if (slot) {
      slot.bg.setStrokeStyle(3, COLORS.danger);
      this.scene.tweens.add({ targets: slot.bg, x: slot.bg.x + 3, duration: 40, yoyo: true, repeat: 2 });
    }
    this.toast.setText(FAIL_TEXT[reason]).setAlpha(1);
    this.scene.tweens.killTweensOf(this.toast);
    this.scene.tweens.add({ targets: this.toast, alpha: 0, delay: 600, duration: 300 });
  }

  update(): void {
    const f = this.f;
    for (const s of this.slots) {
      const a = s.action;
      if (a.kind === 'auto') {
        s.name.setText(`AUTO\n${f.auto ? 'ON' : 'OFF'}`).setColor(hex(f.auto ? COLORS.hp : COLORS.muted));
        s.cost.setText('');
        s.shade.setVisible(false);
        s.cd.setText('');
        s.bg.setStrokeStyle(2, f.auto ? COLORS.hp : COLORS.border);
        continue;
      }
      if (a.kind === 'transform') {
        const form = f.def.form!;
        s.name.setText(form.name);
        if (f.form) {
          s.cost.setText('ACTIVE').setColor(hex(form.color));
          s.shade.setVisible(false);
          s.bg.setStrokeStyle(2, form.color);
        } else {
          const ready = f.canTransform;
          s.cost.setText(f.sandbox ? 'ANY TIME' : form.onDeath ? 'SECOND LIFE' : `${form.energyCost} EN · <${Math.round(form.hpThreshold * 100)}% HP`).setColor(hex(ready ? COLORS.energy : COLORS.muted));
          s.shade.setVisible(!ready).setScale(1, 1);
          s.bg.setStrokeStyle(ready ? 3 : 2, ready ? form.color : COLORS.border);
        }
        s.cd.setText('');
        continue;
      }

      const skill = f.skill(a.slot);
      s.name.setText(skill.name);
      const cd = f.cooldown(skill);
      const affordable = f.canAfford(skill);
      if (skill.ultimate) {
        const gated = !!skill.requiresHpBelow && f.hp > f.maxHp * skill.requiresHpBelow;
        s.cost.setText(gated ? `BELOW ${Math.round(skill.requiresHpBelow! * 100)}% HP` : affordable ? 'READY!' : `${Math.floor(f.ult)}%`).setColor(hex(COLORS.ult));
      } else {
        s.cost.setText(`${skill.energyCost} EN`).setColor(hex(affordable ? COLORS.energy : COLORS.danger));
      }
      const cdFrac = cd > 0 ? cd / skill.cooldown : 0;
      s.shade.setVisible(cd > 0 || !affordable).setScale(1, cd > 0 ? cdFrac : 1);
      s.shade.setAlpha(cd > 0 ? 0.65 : 0.4);
      s.cd.setText(cd > 0 ? cd.toFixed(cd < 1 ? 1 : 0) : '');
      // Fade the name under the countdown so the two don't collide.
      s.name.setAlpha(cd > 0 ? 0.25 : 1);
      const ready = cd <= 0 && affordable && !f.busy && !f.stunned;
      s.bg.setStrokeStyle(ready ? 3 : 2, ready ? (skill.ultimate ? COLORS.ult : shade(skill.color, 0.2)) : COLORS.border);
    }
  }
}
