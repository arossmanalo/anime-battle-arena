import Phaser from 'phaser';
import type { Fighter } from '../../sim/Fighter';
import { mainRole } from '../../sim/roles';
import type { Simulation } from '../../sim/Simulation';
import { GAME_WIDTH } from '../layout';
import { COLORS, hex, hpColor, impactStyle, textStyle } from '../theme';
import { makePortrait } from '../view/portrait';

export const ROLE_LABEL = { tank: 'TANK', damage: 'DMG', support: 'SUP', healer: 'HEAL' } as const;
export const ROLE_COLOR = { tank: 0x6ea8ff, damage: 0xff6a5a, support: 0xc78bff, healer: 0x6dff9d } as const;
export const TEAM_COLOR = [0x39a0ff, 0xff4d4d] as const;

const SIDE_W = 430;
const CARD_H = 64;

interface Card {
  f: Fighter;
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  w: number;
  state: Phaser.GameObjects.Text;
  lagHp: number;
}

/** Top bar for team matches: a card per fighter on each side (portrait, role, HP, energy, ultimate), plus the clock. */
export class TeamHud {
  private readonly cards: Card[] = [];
  private readonly timer: Phaser.GameObjects.Text;
  private readonly decayText: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly sim: Simulation,
    parent: Phaser.GameObjects.Container,
  ) {
    for (const team of [0, 1]) {
      const members = sim.fighters.filter((f) => f.team === team);
      const gap = 4;
      const w = Math.min(112, (SIDE_W - gap * (members.length - 1)) / members.length);
      members.forEach((f, i) => {
        // Team 0 fills from the left edge; team 1 from the right edge, so the middle stays free for the clock.
        const x = team === 0 ? 10 + i * (w + gap) : GAME_WIDTH - 10 - w - i * (w + gap);
        const bg = scene.add.rectangle(x + w / 2, 6 + CARD_H / 2, w, CARD_H, COLORS.panel, 0.92).setStrokeStyle(2, TEAM_COLOR[team]);
        const portrait = makePortrait(scene, x + 20, 6 + 22, 32, f.def);
        const name = scene.add.text(x + 40, 9, f.def.name.toUpperCase(), impactStyle(10)).setOrigin(0, 0);
        const role = mainRole(f.def);
        const tag = scene.add.text(x + 40, 22, ROLE_LABEL[role], textStyle(9, ROLE_COLOR[role], { fontStyle: 'bold' })).setOrigin(0, 0);
        const state = scene.add.text(x + w - 4, 22, '', textStyle(9, COLORS.ult, { fontStyle: 'bold' })).setOrigin(1, 0);
        const gfx = scene.add.graphics();
        parent.add([bg, portrait, name, tag, state, gfx]);
        this.cards.push({ f, gfx, x, w, state, lagHp: f.hp });
      });
    }
    const box = scene.add.rectangle(GAME_WIDTH / 2, 28, 64, 46, COLORS.panel).setStrokeStyle(2, COLORS.border);
    this.timer = scene.add.text(GAME_WIDTH / 2, 28, '', impactStyle(26)).setOrigin(0.5);
    this.decayText = scene.add.text(GAME_WIDTH / 2, 58, '', textStyle(9, COLORS.danger, { fontStyle: 'bold' })).setOrigin(0.5);
    parent.add([box, this.timer, this.decayText]);
  }

  update(dt: number): void {
    for (const c of this.cards) {
      const { f, gfx, x, w } = c;
      gfx.clear();
      const frac = f.hp / f.maxHp;
      c.lagHp = c.lagHp > f.hp ? Math.max(f.hp, c.lagHp - f.maxHp * 0.35 * dt) : f.hp;
      const bx = x + 5;
      const bw = w - 10;
      const y = 6 + 38;
      gfx.fillStyle(0x000000, 0.7).fillRect(bx - 1, y - 1, bw + 2, 10);
      gfx.fillStyle(COLORS.hpLag, 0.8).fillRect(bx, y, bw * (c.lagHp / f.maxHp), 8);
      gfx.fillStyle(hpColor(frac)).fillRect(bx, y, bw * frac, 8);
      gfx.fillStyle(0x000000, 0.7).fillRect(bx, y + 11, bw, 4);
      gfx.fillStyle(COLORS.energy).fillRect(bx, y + 11, bw * (f.energy / f.maxEnergy), 4);
      gfx.fillStyle(0x000000, 0.7).fillRect(bx, y + 17, bw, 3);
      const ready = f.ult >= f.maxUlt;
      gfx.fillStyle(COLORS.ult, ready ? 0.7 + Math.sin(this.sim.time * 10) * 0.3 : 1).fillRect(bx, y + 17, bw * (f.ult / f.maxUlt), 3);
      c.state.setText(f.alive ? (f.transformed ? 'FORM' : f.stunned ? 'STUN' : '') : 'KO');
      c.state.setColor(f.alive ? hex(COLORS.ult) : hex(COLORS.danger));
      if (!f.alive) gfx.fillStyle(0x000000, 0.55).fillRect(x, 6, w, CARD_H);
    }
    this.timer.setText(String(Math.ceil(this.sim.timeLeft)));
    const p = this.sim.decayProgress();
    this.decayText.setText(p > 0 ? `HEALING -${Math.round(70 * p)}%` : '');
  }
}
