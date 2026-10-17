import Phaser from 'phaser';
import type { Fighter } from '../../sim/Fighter';
import type { Simulation } from '../../sim/Simulation';
import { GAME_WIDTH } from '../layout';
import { COLORS, hex, hpColor, impactStyle, textStyle } from '../theme';
import { makePortrait } from '../view/portrait';

const HP_W = 330;
const PIPS = 5;
const PIP_W = 36;
const PIP_GAP = 4;
const ULT_W = 120;

/** One fighter's block in the top bar. `dir` is 1 for the left side and -1 for the mirrored right side. */
class SidePanel {
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly formTag: Phaser.GameObjects.Text;
  private readonly ultLabel: Phaser.GameObjects.Text;
  /** Trailing white bar that catches up to the real HP, so chunks of damage read clearly. */
  private lagHp: number;
  private readonly x0: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly f: Fighter,
    parent: Phaser.GameObjects.Container,
    private readonly dir: 1 | -1,
  ) {
    const edge = dir === 1 ? 10 : GAME_WIDTH - 10;
    const portraitX = edge + dir * 32;
    this.x0 = edge + dir * 70;
    this.lagHp = f.hp;

    const bg = scene.add
      .rectangle(edge + (dir * 430) / 2, 38, 430, 70, COLORS.panel, 0.92)
      .setStrokeStyle(1, COLORS.border);
    const portrait = makePortrait(scene, portraitX, 38, 56, f.def);
    const origin = dir === 1 ? 0 : 1;
    const name = scene.add.text(this.x0, 6, f.def.name.toUpperCase(), impactStyle(18)).setOrigin(origin, 0);
    this.formTag = scene.add
      .text(this.x0 + dir * (name.width + 10), 10, '', textStyle(11, COLORS.ult, { fontStyle: 'bold' }))
      .setOrigin(origin, 0);
    this.hpText = scene.add
      .text(this.x0 + dir * (HP_W - 4), 33, '', textStyle(10, 0xffffff, { fontStyle: 'bold' }))
      .setOrigin(1 - origin, 0);
    this.bars = scene.add.graphics();
    this.ultLabel = scene.add
      .text(this.x0 + dir * (HP_W - ULT_W - 6), 54, 'ULT', textStyle(9, COLORS.ult, { fontStyle: 'bold' }))
      .setOrigin(1 - origin, 0.5);

    parent.add([bg, portrait, name, this.formTag, this.bars, this.hpText, this.ultLabel]);
  }

  /** x of a bar segment starting `offset` px in from the panel's inner edge, `w` wide. */
  private segX(offset: number, w: number): number {
    return this.dir === 1 ? this.x0 + offset : this.x0 - offset - w;
  }

  update(dt: number): void {
    const f = this.f;
    this.lagHp = this.lagHp > f.hp ? Math.max(f.hp, this.lagHp - f.maxHp * 0.35 * dt) : f.hp;
    const g = this.bars;
    g.clear();

    // HP
    const hpFrac = f.hp / f.maxHp;
    g.fillStyle(0x000000, 0.7).fillRect(this.segX(0, HP_W) - 2, 30, HP_W + 4, 18);
    g.fillStyle(COLORS.hpLag, 0.85).fillRect(this.segX(0, HP_W * (this.lagHp / f.maxHp)), 32, HP_W * (this.lagHp / f.maxHp), 14);
    g.fillStyle(hpColor(hpFrac)).fillRect(this.segX(0, HP_W * hpFrac), 32, HP_W * hpFrac, 14);
    g.fillStyle(0xffffff, 0.18).fillRect(this.segX(0, HP_W * hpFrac), 32, HP_W * hpFrac, 5);
    this.hpText.setText(`${Math.ceil(f.hp)} / ${f.maxHp}`);

    // Energy pips
    const perPip = f.maxEnergy / PIPS;
    for (let i = 0; i < PIPS; i++) {
      const fill = Phaser.Math.Clamp((f.energy - i * perPip) / perPip, 0, 1);
      const x = this.segX(i * (PIP_W + PIP_GAP), PIP_W);
      g.fillStyle(0x000000, 0.7).fillRect(x, 50, PIP_W, 8);
      const w = PIP_W * fill;
      g.fillStyle(fill >= 1 ? COLORS.energy : 0x1f5a99).fillRect(this.dir === 1 ? x : x + PIP_W - w, 50, w, 8);
    }

    // Ultimate meter
    const ultFrac = f.ult / f.maxUlt;
    const ready = ultFrac >= 1;
    const ux = this.segX(HP_W - ULT_W, ULT_W);
    g.fillStyle(0x000000, 0.7).fillRect(ux, 50, ULT_W, 8);
    const uw = ULT_W * ultFrac;
    const blink = ready ? 0.65 + Math.sin(this.scene.time.now / 90) * 0.35 : 1;
    g.fillStyle(COLORS.ult, blink).fillRect(this.dir === 1 ? ux : ux + ULT_W - uw, 50, uw, 8);
    this.ultLabel.setText(ready ? 'ULT READY' : 'ULT');

    this.formTag.setText(f.form ? f.form.name.toUpperCase() : '');
    this.formTag.setColor(hex(f.form?.color ?? COLORS.ult));
  }
}

/** Top bar: both fighters' panels and the match timer. */
export class Hud {
  private readonly panels: SidePanel[];
  private readonly timer: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly sim: Simulation,
    parent: Phaser.GameObjects.Container,
  ) {
    // 1v1 for now: first fighter of each team. Tag teams will stack extra mini-panels here.
    const [left, right] = [0, 1].map((t) => sim.fighters.find((f) => f.team === t)!);
    this.panels = [new SidePanel(scene, left, parent, 1), new SidePanel(scene, right, parent, -1)];
    const box = scene.add.rectangle(GAME_WIDTH / 2, 30, 64, 46, COLORS.panel).setStrokeStyle(2, COLORS.border);
    this.timer = scene.add.text(GAME_WIDTH / 2, 30, '99', impactStyle(30)).setOrigin(0.5);
    parent.add([box, this.timer]);
  }

  update(dt: number): void {
    this.panels.forEach((p) => p.update(dt));
    const left = Math.ceil(this.sim.timeLeft);
    this.timer.setText(String(left));
    this.timer.setColor(left <= 10 ? hex(COLORS.danger) : hex(COLORS.text));
  }
}
