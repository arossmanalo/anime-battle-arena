import Phaser from 'phaser';
import { ROSTER } from '../../data/fighters';
import { draftOrder, fillTeam, maxDraftSize, pickForTeam, type TeamSize } from '../../sim/draft';
import { Rng } from '../../sim/rng';
import { mainRole, roleScores } from '../../sim/roles';
import { defaultRow } from '../../sim/Simulation';
import type { Difficulty, FighterDef } from '../../sim/types';
import { sfx } from '../audio/Sfx';
import { ROLE_COLOR, ROLE_LABEL, TEAM_COLOR } from '../hud/TeamHud';
import { GAME_HEIGHT, GAME_WIDTH, fitCamera } from '../layout';
import { newSeed, type MatchSetup } from '../match';
import { COLORS, hex, impactStyle, textStyle } from '../theme';
import { makePortrait } from '../view/portrait';

type Row = 'front' | 'back';
interface Member {
  def: FighterDef;
  row: Row;
}

const CARD_W = 104;
const CARD_H = 84;
const GRID_X = 312;
const GRID_Y = 150;
const SLOT_H = 74;

/** A role summary for a fighter, e.g. "TANK · DMG": every role scored at 0.35 or more, strongest first. */
function roleChips(def: FighterDef): { label: string; color: number }[] {
  const s = roleScores(def);
  const roles = (Object.keys(s) as (keyof typeof s)[]).filter((r) => s[r] >= 0.35).sort((a, b) => s[b] - s[a]);
  return (roles.length ? roles : [mainRole(def)]).map((r) => ({ label: ROLE_LABEL[r], color: ROLE_COLOR[r] }));
}

/** Pick a team of 2-4 fighters (free pick or snake draft), arrange the formation, and see the CPU's team. */
export class TeamSelectScene extends Phaser.Scene {
  private size: TeamSize = 2;
  private mode: 'free' | 'draft' = 'free';
  private difficulty: Difficulty = 'normal';
  private mine: Member[] = [];
  private cpu: FighterDef[] = [];
  /** Draft: how many picks have been made, and whether we're waiting on the CPU. */
  private draftIndex = 0;
  private cpuThinking = false;
  private rng = new Rng(newSeed());
  private dyn!: Phaser.GameObjects.Container;

  constructor() {
    super('TeamSelect');
  }

  init(data: Partial<MatchSetup>): void {
    this.mine = [];
    this.cpu = [];
    this.draftIndex = 0;
    this.cpuThinking = false;
    this.rng = new Rng(newSeed());
    if (data.difficulty) this.difficulty = data.difficulty;
    if (data.team) {
      this.size = data.team.size;
      this.mode = data.team.mode;
      if (this.mode === 'free') {
        this.mine = data.team.player.map((m) => ({ def: ROSTER.find((d) => d.id === m.id)!, row: m.row })).filter((m) => m.def);
        this.cpu = data.team.enemy.map((m) => ROSTER.find((d) => d.id === m.id)!).filter(Boolean);
      }
    }
  }

  create(): void {
    fitCamera(this.cameras.main);
    this.add.text(GAME_WIDTH / 2, 28, 'TEAM BATTLE', impactStyle(32)).setOrigin(0.5);
    this.dyn = this.add.container(0, 0);
    if (this.mode === 'free' && this.cpu.length < this.size) this.rollCpu();
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MainMenu'));
    this.input.keyboard?.on('keydown-ENTER', () => this.start());
    this.refresh();
  }

  // ---- state -----------------------------------------------------------------------------------

  private draftAllowed(size: number): boolean {
    return size <= maxDraftSize(ROSTER.length);
  }

  private rollCpu(): void {
    this.cpu = fillTeam([], ROSTER, this.size, () => this.rng.next());
  }

  private setSize(size: TeamSize): void {
    if (this.mode === 'draft' && !this.draftAllowed(size)) return;
    this.size = size;
    this.resetPicks();
  }

  private setMode(mode: 'free' | 'draft'): void {
    this.mode = mode;
    if (mode === 'draft' && !this.draftAllowed(this.size)) this.size = Math.max(2, maxDraftSize(ROSTER.length)) as TeamSize;
    this.resetPicks();
  }

  private resetPicks(): void {
    this.mine = [];
    this.cpu = [];
    this.draftIndex = 0;
    this.cpuThinking = false;
    if (this.mode === 'free') this.rollCpu();
    else this.advanceDraft();
    this.refresh();
  }

  private taken(): Set<string> {
    return new Set([...this.mine.map((m) => m.def.id), ...this.cpu.map((d) => d.id)]);
  }

  private isMyTurn(): boolean {
    if (this.mode === 'free') return this.mine.length < this.size;
    return this.draftIndex < this.size * 2 && draftOrder(this.size)[this.draftIndex];
  }

  /** Draft: let the CPU make its picks until it is the player's turn again. */
  private advanceDraft(): void {
    if (this.mode !== 'draft') return;
    const order = draftOrder(this.size);
    if (this.draftIndex >= order.length || order[this.draftIndex] || this.cpuThinking) return;
    this.cpuThinking = true;
    this.time.delayedCall(550, () => {
      const pick = pickForTeam(this.cpu, ROSTER, this.size, () => this.rng.next(), this.taken());
      if (pick) this.cpu.push(pick);
      this.draftIndex++;
      this.cpuThinking = false;
      this.refresh();
      this.advanceDraft();
    });
  }

  private pick(def: FighterDef): void {
    if (!this.isMyTurn() || this.cpuThinking) return;
    if (this.mode === 'draft' && this.taken().has(def.id)) return;
    if (this.mine.some((m) => m.def.id === def.id)) return;
    sfx(this).play('click');
    this.mine.push({ def, row: defaultRow(def) });
    if (this.mode === 'draft') {
      this.draftIndex++;
      this.advanceDraft();
    }
    this.refresh();
  }

  private remove(i: number): void {
    if (this.mode === 'draft') return; // picks are final in a draft
    this.mine.splice(i, 1);
    this.refresh();
  }

  private ready(): boolean {
    return this.mine.length === this.size && this.cpu.length === this.size && !this.cpuThinking;
  }

  private start(): void {
    if (!this.ready()) return;
    sfx(this).play('click');
    const setup: MatchSetup = {
      playerId: this.mine[0].def.id,
      enemyId: this.cpu[0].id,
      difficulty: this.difficulty,
      seed: newSeed(),
      team: {
        size: this.size,
        mode: this.mode,
        player: this.mine.map((m) => ({ id: m.def.id, row: m.row })),
        enemy: this.cpu.map((d) => ({ id: d.id, row: defaultRow(d) })),
      },
    };
    this.scene.start('Battle', setup);
  }

  // ---- drawing ---------------------------------------------------------------------------------

  private text(x: number, y: number, label: string, style: Phaser.Types.GameObjects.Text.TextStyle, onClick?: () => void): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, label, style).setOrigin(0.5);
    if (onClick) t.setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
    this.dyn.add(t);
    return t;
  }

  private refresh(): void {
    this.dyn.removeAll(true);

    // Options row.
    this.text(GAME_WIDTH / 2 - 330, 64, 'SIZE', textStyle(11, COLORS.muted));
    ([2, 3, 4] as TeamSize[]).forEach((n, i) => {
      const off = this.mode === 'draft' && !this.draftAllowed(n);
      this.text(GAME_WIDTH / 2 - 270 + i * 62, 64, `${n}v${n}`, impactStyle(18, off ? 0x4a4f66 : n === this.size ? COLORS.ult : COLORS.muted), () => this.setSize(n));
    });
    this.text(GAME_WIDTH / 2 - 40, 64, 'MODE', textStyle(11, COLORS.muted));
    (['free', 'draft'] as const).forEach((m, i) => {
      this.text(GAME_WIDTH / 2 + 40 + i * 100, 64, m === 'free' ? 'FREE PICK' : 'DRAFT', impactStyle(18, m === this.mode ? COLORS.ult : COLORS.muted), () => this.setMode(m));
    });
    this.text(GAME_WIDTH / 2 + 250, 64, 'CPU', textStyle(11, COLORS.muted));
    (['easy', 'normal', 'hard'] as Difficulty[]).forEach((d, i) => {
      this.text(GAME_WIDTH / 2 + 300 + i * 56, 64, d.toUpperCase(), impactStyle(14, d === this.difficulty ? COLORS.ult : COLORS.muted), () => {
        this.difficulty = d;
        this.refresh();
      });
    });
    if (this.mode === 'draft' && !this.draftAllowed(4)) {
      this.text(GAME_WIDTH / 2, 90, `Draft needs ${8} fighters for 4v4 (you have ${ROSTER.length}). Free pick allows any size.`, textStyle(11, COLORS.muted));
    }

    // Status line.
    let status = '';
    if (this.mode === 'draft') {
      status = this.draftIndex >= this.size * 2 ? 'Draft complete. Set your formation and start.' : this.isMyTurn() ? `Your pick (${this.mine.length + 1} of ${this.size})` : 'CPU is picking…';
    } else {
      status = this.mine.length < this.size ? `Pick ${this.size - this.mine.length} more fighter${this.size - this.mine.length === 1 ? '' : 's'}` : 'Team ready. Click FRONT / BACK to set the formation.';
    }
    this.text(GAME_WIDTH / 2, 116, status, textStyle(14, this.isMyTurn() ? COLORS.ult : COLORS.text, { fontStyle: 'bold' }));

    this.drawTeam(20, 'YOUR TEAM', TEAM_COLOR[0], this.mine.map((m) => ({ def: m.def, row: m.row })), true);
    this.drawTeam(GAME_WIDTH - 20 - 280, 'CPU TEAM', TEAM_COLOR[1], this.cpu.map((d) => ({ def: d, row: defaultRow(d) })), false);

    // Roster grid.
    const taken = this.taken();
    ROSTER.forEach((def, i) => {
      const x = GRID_X + (i % 3) * (CARD_W + 8) + CARD_W / 2;
      const y = GRID_Y + Math.floor(i / 3) * (CARD_H + 8) + CARD_H / 2;
      const mineIdx = this.mine.findIndex((m) => m.def.id === def.id);
      const used = this.mode === 'draft' ? taken.has(def.id) : mineIdx >= 0;
      const enabled = this.isMyTurn() && !used && !this.cpuThinking;
      const frame = this.add.rectangle(x, y, CARD_W, CARD_H, COLORS.panel).setStrokeStyle(2, mineIdx >= 0 ? TEAM_COLOR[0] : this.cpu.some((d) => d.id === def.id) && this.mode === 'draft' ? TEAM_COLOR[1] : COLORS.border);
      if (enabled) frame.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.pick(def));
      const portrait = makePortrait(this, x, y - 14, 38, def);
      const name = this.add.text(x, y + 14, def.name.toUpperCase(), impactStyle(12)).setOrigin(0.5);
      const chips = roleChips(def);
      const chipTexts = chips.slice(0, 3).map((c, k) => this.add.text(x + (k - (Math.min(3, chips.length) - 1) / 2) * 30, y + 30, c.label, textStyle(8, c.color, { fontStyle: 'bold' })).setOrigin(0.5));
      this.dyn.add([frame, portrait, name, ...chipTexts]);
      if (used) this.dyn.add(this.add.rectangle(x, y, CARD_W, CARD_H, 0x000000, 0.55));
    });

    // Start button.
    const ready = this.ready();
    const go = this.text(GAME_WIDTH / 2, GAME_HEIGHT - 46, 'START BATTLE', impactStyle(34, ready ? COLORS.ult : 0x4a4f66), () => this.start());
    if (!ready) go.disableInteractive();
    this.text(GAME_WIDTH / 2, GAME_HEIGHT - 18, 'or press ENTER · ESC back', textStyle(11, COLORS.muted));
    if (this.mode === 'free') {
      this.text(GAME_WIDTH - 20 - 140, GAME_HEIGHT - 110, 'REROLL CPU TEAM', textStyle(12, COLORS.energy, { fontStyle: 'bold' }), () => {
        this.rollCpu();
        this.refresh();
      });
    }
  }

  private drawTeam(x: number, title: string, color: number, members: Member[], mine: boolean): void {
    this.text(x + 140, 150, title, impactStyle(16, color));
    for (let i = 0; i < this.size; i++) {
      const y = 190 + i * (SLOT_H + 6);
      const m = members[i];
      const bg = this.add.rectangle(x + 140, y + SLOT_H / 2, 280, SLOT_H, COLORS.panel).setStrokeStyle(2, m ? color : COLORS.border, m ? 1 : 0.5);
      this.dyn.add(bg);
      if (!m) {
        this.text(x + 140, y + SLOT_H / 2, mine && this.isMyTurn() ? 'pick a fighter' : this.mode === 'draft' && !mine ? '…' : 'empty', textStyle(12, COLORS.muted));
        continue;
      }
      const portrait = makePortrait(this, x + 36, y + SLOT_H / 2, 52, m.def);
      const name = this.add.text(x + 72, y + 10, m.def.name.toUpperCase(), impactStyle(16)).setOrigin(0, 0);
      const chips = roleChips(m.def);
      const chipTexts = chips.map((c, k) => this.add.text(x + 72 + k * 36, y + 32, c.label, textStyle(10, c.color, { fontStyle: 'bold' })).setOrigin(0, 0));
      this.dyn.add([portrait, name, ...chipTexts]);
      const rowBtn = this.add
        .text(x + 72, y + 50, m.row === 'front' ? '[ FRONT LINE ]' : '[ BACK LINE ]', textStyle(11, m.row === 'front' ? 0xff9a5a : 0x7ad1ff, { fontStyle: 'bold' }))
        .setOrigin(0, 0);
      this.dyn.add(rowBtn);
      if (mine) {
        const idx = i;
        rowBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          this.mine[idx].row = this.mine[idx].row === 'front' ? 'back' : 'front';
          this.refresh();
        });
        if (this.mode === 'free') {
          const x2 = this.add.text(x + 266, y + 6, '✕', textStyle(14, COLORS.muted, { fontStyle: 'bold' })).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
          x2.on('pointerdown', () => this.remove(idx));
          x2.on('pointerover', () => x2.setColor(hex(COLORS.danger)));
          x2.on('pointerout', () => x2.setColor(hex(COLORS.muted)));
          this.dyn.add(x2);
        }
      }
    }
  }
}
