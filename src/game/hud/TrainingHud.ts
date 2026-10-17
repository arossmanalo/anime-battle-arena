import Phaser from 'phaser';
import type { Fighter } from '../../sim/Fighter';
import type { Simulation } from '../../sim/Simulation';
import { GAME_WIDTH } from '../layout';
import { COLORS, hex, impactStyle, textStyle } from '../theme';

/** Seconds of recent damage used for the DPS readout. */
const DPS_WINDOW = 5;
const PANEL_W = 430;

/** Training mode panel (top right, where the opponent's panel normally is): what the dummy has taken, plus the toggles. */
export class TrainingHud {
  private readonly title: Phaser.GameObjects.Text;
  private readonly stats: Phaser.GameObjects.Text;
  private readonly last: Phaser.GameObjects.Text;
  private readonly keys: Phaser.GameObjects.Text;
  private readonly hits: { time: number; damage: number }[] = [];
  private lastHit = '';
  private total = 0;
  private count = 0;
  private best = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly sim: Simulation,
    private readonly dummy: Fighter,
    parent: Phaser.GameObjects.Container,
  ) {
    const x0 = GAME_WIDTH - 10 - PANEL_W;
    const bg = scene.add.rectangle(x0 + PANEL_W / 2, 38, PANEL_W, 70, COLORS.panel, 0.92).setStrokeStyle(1, COLORS.border);
    this.title = scene.add.text(x0 + 12, 6, 'TRAINING', impactStyle(18, COLORS.ult));
    this.last = scene.add.text(x0 + 130, 10, '', textStyle(11, COLORS.muted));
    this.stats = scene.add.text(x0 + 12, 30, '', textStyle(13, 0xffffff, { fontStyle: 'bold' }));
    this.keys = scene.add.text(x0 + 12, 51, '', textStyle(10, COLORS.muted));
    parent.add([bg, this.title, this.last, this.stats, this.keys]);
  }

  /** A hit landed (called for every `hit` event). Only damage to the dummy counts. */
  onHit(targetUid: number, damage: number, skillName: string): void {
    if (targetUid !== this.dummy.uid || damage <= 0) return;
    this.hits.push({ time: this.sim.time, damage });
    this.total += damage;
    this.count++;
    this.best = Math.max(this.best, damage);
    this.lastHit = `${Math.round(damage)}  ${skillName}`;
  }

  reset(): void {
    this.hits.length = 0;
    this.lastHit = '';
    this.total = 0;
    this.count = 0;
    this.best = 0;
  }

  update(): void {
    const now = this.sim.time;
    while (this.hits.length && now - this.hits[0].time > DPS_WINDOW) this.hits.shift();
    const recent = this.hits.reduce((s, h) => s + h.damage, 0);
    const span = this.hits.length ? Math.max(1, Math.min(DPS_WINDOW, now - this.hits[0].time)) : 1;
    this.last.setText(this.lastHit ? `last hit  ${this.lastHit}` : 'hit the dummy with anything');
    this.stats.setText(
      `TOTAL ${Math.round(this.total)}    HITS ${this.count}    BEST ${Math.round(this.best)}    DPS ${Math.round(recent / span)}`,
    );
    const cd = this.sim.noCooldowns ? 'OFF' : 'on';
    const mode = { still: 'STILL', pace: 'PACING', strafe: 'STRAFING' }[this.sim.dummyMode];
    this.keys.setText(`R reset   C cooldowns: ${cd}   D dummy: ${mode}   T form on/off   energy: infinite`);
    this.keys.setColor(hex(this.sim.noCooldowns ? COLORS.energy : COLORS.muted));
  }
}
