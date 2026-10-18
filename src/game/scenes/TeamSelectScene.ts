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
type Side = 'mine' | 'cpu';
interface Member {
  def: FighterDef;
  row: Row;
}
/** What is being dragged: a fighter from the roster, or one already on a team. */
type DragSource = { kind: 'roster'; def: FighterDef } | { kind: 'slot'; side: Side; idx: number; def: FighterDef };

const CARD_W = 104;
const CARD_H = 84;
const GRID_X = 312;
const GRID_Y = 150;
const SLOT_H = 74;
const SLOT_W = 280;
/** Pixels the pointer must move before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 6;

/** A role summary for a fighter, e.g. "TANK · DMG": every role scored at 0.35 or more, strongest first. */
function roleChips(def: FighterDef): { label: string; color: number }[] {
  const s = roleScores(def);
  const roles = (Object.keys(s) as (keyof typeof s)[]).filter((r) => s[r] >= 0.35).sort((a, b) => s[b] - s[a]);
  return (roles.length ? roles : [mainRole(def)]).map((r) => ({ label: ROLE_LABEL[r], color: ROLE_COLOR[r] }));
}

/**
 * Build both teams by dragging fighters from the roster onto team slots (or between slots, or off a slot to remove
 * it), then set each fighter's formation. Free pick lets you build both sides; a draft is turn-based against the CPU.
 */
export class TeamSelectScene extends Phaser.Scene {
  private size: TeamSize = 2;
  private mode: 'free' | 'draft' = 'free';
  private difficulty: Difficulty = 'normal';
  private mine: Member[] = [];
  private cpu: Member[] = [];
  /** Draft: how many picks have been made, and whether we're waiting on the CPU. */
  private draftIndex = 0;
  private cpuThinking = false;
  private rng = new Rng(newSeed());
  private dyn!: Phaser.GameObjects.Container;

  // Drag state.
  private drag: { source: DragSource; startX: number; startY: number; moved: boolean } | null = null;
  private ghost: Phaser.GameObjects.Container | null = null;
  private highlight!: Phaser.GameObjects.Graphics;
  /** Slot rectangles from the last draw, for drop tests. */
  private slotRects: { side: Side; idx: number; x: number; y: number; w: number; h: number }[] = [];

  constructor() {
    super('TeamSelect');
  }

  init(data: Partial<MatchSetup>): void {
    this.mine = [];
    this.cpu = [];
    this.draftIndex = 0;
    this.cpuThinking = false;
    this.drag = null;
    this.ghost = null;
    this.rng = new Rng(newSeed());
    if (data.difficulty) this.difficulty = data.difficulty;
    if (data.team) {
      this.size = data.team.size;
      this.mode = data.team.mode;
      if (this.mode === 'free') {
        this.mine = data.team.player.map((m) => ({ def: ROSTER.find((d) => d.id === m.id)!, row: m.row })).filter((m) => m.def);
        this.cpu = data.team.enemy.map((m) => ({ def: ROSTER.find((d) => d.id === m.id)!, row: m.row })).filter((m) => m.def);
      }
    }
  }

  create(): void {
    fitCamera(this.cameras.main);
    this.add.text(GAME_WIDTH / 2, 28, 'TEAM BATTLE', impactStyle(32)).setOrigin(0.5);
    this.dyn = this.add.container(0, 0);
    this.highlight = this.add.graphics().setDepth(900);
    if (this.mode === 'free' && this.cpu.length < this.size) this.rollCpu(this.cpu);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MainMenu'));
    this.input.keyboard?.on('keydown-ENTER', () => this.start());
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.refresh();
  }

  // ---- state -----------------------------------------------------------------------------------

  private draftAllowed(size: number): boolean {
    return size <= maxDraftSize(ROSTER.length);
  }

  /** The smart picker fills the CPU team (keeping any fighters already there). */
  private rollCpu(keep: Member[] = []): void {
    const defs = fillTeam(keep.map((m) => m.def), ROSTER, this.size, () => this.rng.next());
    this.cpu = defs.map((d, i) => keep[i] ?? { def: d, row: defaultRow(d) });
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
    return new Set([...this.mine.map((m) => m.def.id), ...this.cpu.map((m) => m.def.id)]);
  }

  private isMyTurn(): boolean {
    if (this.mode === 'free') return true;
    return this.draftIndex < this.size * 2 && draftOrder(this.size)[this.draftIndex];
  }

  /** Draft: let the CPU make its picks until it is the player's turn again. */
  private advanceDraft(): void {
    if (this.mode !== 'draft') return;
    const order = draftOrder(this.size);
    if (this.draftIndex >= order.length || order[this.draftIndex] || this.cpuThinking) return;
    this.cpuThinking = true;
    this.time.delayedCall(550, () => {
      const pick = pickForTeam(this.cpu.map((m) => m.def), ROSTER, this.size, () => this.rng.next(), this.taken());
      if (pick) this.cpu.push({ def: pick, row: defaultRow(pick) });
      this.draftIndex++;
      this.cpuThinking = false;
      this.refresh();
      this.advanceDraft();
    });
  }

  private list(side: Side): Member[] {
    return side === 'mine' ? this.mine : this.cpu;
  }

  private ready(): boolean {
    return this.mine.length === this.size && this.cpu.length === this.size && !this.cpuThinking;
  }

  private start(): void {
    if (!this.ready()) return;
    sfx(this).play('click');
    const setup: MatchSetup = {
      playerId: this.mine[0].def.id,
      enemyId: this.cpu[0].def.id,
      difficulty: this.difficulty,
      seed: newSeed(),
      team: {
        size: this.size,
        mode: this.mode,
        player: this.mine.map((m) => ({ id: m.def.id, row: m.row })),
        enemy: this.cpu.map((m) => ({ id: m.def.id, row: m.row })),
      },
    };
    this.scene.start('Battle', setup);
  }

  // ---- drag and drop ---------------------------------------------------------------------------

  private canDrag(source: DragSource): boolean {
    if (this.cpuThinking) return false;
    if (this.mode === 'free') return true;
    // Draft: only your own picks from the roster, and only on your turn.
    return source.kind === 'roster' && this.isMyTurn() && !this.taken().has(source.def.id);
  }

  private beginDrag(source: DragSource, p: Phaser.Input.Pointer): void {
    if (!this.canDrag(source)) return;
    this.drag = { source, startX: p.worldX, startY: p.worldY, moved: false };
  }

  private makeGhost(def: FighterDef): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0).setDepth(1000).setAlpha(0.92);
    c.add(this.add.rectangle(0, 0, 96, 70, COLORS.panelLight).setStrokeStyle(2, COLORS.ult));
    c.add(makePortrait(this, 0, -10, 36, def));
    c.add(this.add.text(0, 20, def.name.toUpperCase(), impactStyle(11)).setOrigin(0.5));
    return c;
  }

  private slotAt(x: number, y: number): { side: Side; idx: number } | null {
    for (const r of this.slotRects) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return { side: r.side, idx: r.idx };
    return null;
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d) return;
    if (!d.moved && Math.hypot(p.worldX - d.startX, p.worldY - d.startY) < DRAG_THRESHOLD) return;
    if (!d.moved) {
      d.moved = true;
      this.ghost = this.makeGhost(d.source.def);
    }
    this.ghost?.setPosition(p.worldX, p.worldY);
    // Show where it would land.
    this.highlight.clear();
    const hit = this.slotAt(p.worldX, p.worldY);
    if (hit && this.dropAllowed(d.source, hit.side, hit.idx)) {
      const r = this.slotRects.find((s) => s.side === hit.side && s.idx === hit.idx)!;
      this.highlight.lineStyle(3, COLORS.ult, 1).strokeRect(r.x, r.y, r.w, r.h);
    }
  }

  /** Whether dropping `source` onto a slot would do something. */
  private dropAllowed(source: DragSource, side: Side, idx: number): boolean {
    const target = this.list(side);
    if (this.mode === 'draft') return source.kind === 'roster' && side === 'mine' && target.length < this.size && this.isMyTurn() && !this.taken().has(source.def.id);
    if (source.kind === 'roster') {
      // A team can't have the same fighter twice.
      return !target.some((m, k) => m.def.id === source.def.id && k !== idx);
    }
    if (source.side === side && source.idx === idx) return false;
    const other = this.list(source.side);
    const moving = other[source.idx];
    const displaced = idx < target.length ? target[idx] : undefined;
    // After the move or swap neither team may hold the same fighter twice.
    if (target.some((m, k) => k !== idx && m.def.id === moving.def.id && !(source.side === side && k === source.idx))) return false;
    if (displaced && side !== source.side && other.some((m, k) => k !== source.idx && m.def.id === displaced.def.id)) return false;
    // Moving into an empty slot of a different team needs room there.
    if (!displaced && side !== source.side && target.length >= this.size) return false;
    return true;
  }

  private drop(source: DragSource, side: Side, idx: number): void {
    const target = this.list(side);
    if (source.kind === 'roster') {
      const m: Member = { def: source.def, row: defaultRow(source.def) };
      if (idx < target.length && this.mode === 'free') target[idx] = m;
      else if (target.length < this.size) target.push(m);
      if (this.mode === 'draft') {
        this.draftIndex++;
        this.advanceDraft();
      }
      return;
    }
    const other = this.list(source.side);
    const moving = other[source.idx];
    if (idx < target.length) {
      // Swap the two fighters (formations travel with them).
      const displaced = target[idx];
      target[idx] = moving;
      other[source.idx] = displaced;
    } else {
      other.splice(source.idx, 1);
      target.push(moving);
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    this.drag = null;
    this.highlight.clear();
    this.ghost?.destroy();
    this.ghost = null;
    if (!d) return;
    if (!d.moved) {
      // A plain click: a roster click adds the fighter to your team, in the first free slot.
      if (d.source.kind === 'roster' && this.mine.length < this.size && this.dropAllowed(d.source, 'mine', this.mine.length)) {
        sfx(this).play('click');
        this.drop(d.source, 'mine', this.mine.length);
        this.refresh();
      }
      return;
    }
    const hit = this.slotAt(p.worldX, p.worldY);
    if (hit && this.dropAllowed(d.source, hit.side, hit.idx)) {
      sfx(this).play('click');
      this.drop(d.source, hit.side, hit.idx);
    } else if (!hit && d.source.kind === 'slot' && this.mode === 'free') {
      // Dragged off a slot into empty space: remove the fighter.
      this.list(d.source.side).splice(d.source.idx, 1);
    }
    this.refresh();
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
    this.slotRects = [];

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
      this.text(GAME_WIDTH / 2, 90, `Draft needs 8 fighters for 4v4 (you have ${ROSTER.length}). Free pick allows any size.`, textStyle(11, COLORS.muted));
    }

    // Status line.
    let status = '';
    if (this.mode === 'draft') {
      status = this.draftIndex >= this.size * 2 ? 'Draft complete. Set your formation and start.' : this.isMyTurn() ? `Your pick (${this.mine.length + 1} of ${this.size}): drag a fighter onto your team` : 'CPU is picking…';
    } else if (this.mine.length < this.size || this.cpu.length < this.size) {
      status = 'Drag fighters from the middle onto either team. Drag between slots to swap, or off a slot to remove.';
    } else {
      status = 'Both teams ready. Click FRONT / BACK to set a formation.';
    }
    this.text(GAME_WIDTH / 2, 116, status, textStyle(13, COLORS.text, { fontStyle: 'bold' }));

    this.drawTeam(20, 'YOUR TEAM', TEAM_COLOR[0], 'mine');
    this.drawTeam(GAME_WIDTH - 20 - SLOT_W, 'CPU TEAM', TEAM_COLOR[1], 'cpu');

    // Roster grid: drag a card onto a slot (or just click to add it to your team).
    const taken = this.taken();
    ROSTER.forEach((def, i) => {
      const x = GRID_X + (i % 3) * (CARD_W + 8) + CARD_W / 2;
      const y = GRID_Y + Math.floor(i / 3) * (CARD_H + 8) + CARD_H / 2;
      const onMine = this.mine.some((m) => m.def.id === def.id);
      const onCpu = this.cpu.some((m) => m.def.id === def.id);
      const used = this.mode === 'draft' ? taken.has(def.id) : false;
      const frame = this.add.rectangle(x, y, CARD_W, CARD_H, COLORS.panel).setStrokeStyle(2, onMine ? TEAM_COLOR[0] : onCpu ? TEAM_COLOR[1] : COLORS.border);
      const source: DragSource = { kind: 'roster', def };
      if (!used && this.canDrag(source)) {
        frame.setInteractive({ useHandCursor: true }).on('pointerdown', (p: Phaser.Input.Pointer) => this.beginDrag(source, p));
      }
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
      this.text(GAME_WIDTH / 2 - 110, 466, 'AUTO-FILL CPU (keeps your picks)', textStyle(11, COLORS.energy), () => {
        this.rollCpu(this.cpu);
        this.refresh();
      });
      this.text(GAME_WIDTH / 2 + 130, 466, 'REROLL CPU TEAM', textStyle(11, COLORS.muted), () => {
        this.rollCpu();
        this.refresh();
      });
    }
  }

  private drawTeam(x: number, title: string, color: number, side: Side): void {
    this.text(x + SLOT_W / 2, 150, title, impactStyle(16, color));
    const members = this.list(side);
    for (let i = 0; i < this.size; i++) {
      const y = 190 + i * (SLOT_H + 6);
      const m = members[i];
      this.slotRects.push({ side, idx: i, x, y, w: SLOT_W, h: SLOT_H });
      const bg = this.add.rectangle(x + SLOT_W / 2, y + SLOT_H / 2, SLOT_W, SLOT_H, COLORS.panel).setStrokeStyle(2, m ? color : COLORS.border, m ? 1 : 0.5);
      this.dyn.add(bg);
      if (!m) {
        const hint = this.mode === 'draft' && side === 'cpu' ? '…' : 'drag a fighter here';
        this.text(x + SLOT_W / 2, y + SLOT_H / 2, hint, textStyle(12, COLORS.muted));
        continue;
      }
      const source: DragSource = { kind: 'slot', side, idx: i, def: m.def };
      if (this.canDrag(source)) bg.setInteractive({ useHandCursor: true }).on('pointerdown', (p: Phaser.Input.Pointer) => this.beginDrag(source, p));
      const portrait = makePortrait(this, x + 36, y + SLOT_H / 2, 52, m.def);
      const name = this.add.text(x + 72, y + 10, m.def.name.toUpperCase(), impactStyle(16)).setOrigin(0, 0);
      const chips = roleChips(m.def);
      const chipTexts = chips.map((c, k) => this.add.text(x + 72 + k * 36, y + 32, c.label, textStyle(10, c.color, { fontStyle: 'bold' })).setOrigin(0, 0));
      const rowBtn = this.add
        .text(x + 72, y + 50, m.row === 'front' ? '[ FRONT LINE ]' : '[ BACK LINE ]', textStyle(11, m.row === 'front' ? 0xff9a5a : 0x7ad1ff, { fontStyle: 'bold' }))
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      rowBtn.on('pointerdown', () => {
        m.row = m.row === 'front' ? 'back' : 'front';
        this.refresh();
      });
      this.dyn.add([portrait, name, ...chipTexts, rowBtn]);
      if (this.mode === 'free') {
        const x2 = this.add.text(x + SLOT_W - 14, y + 6, '✕', textStyle(14, COLORS.muted, { fontStyle: 'bold' })).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
        x2.on('pointerdown', () => {
          members.splice(i, 1);
          this.refresh();
        });
        x2.on('pointerover', () => x2.setColor(hex(COLORS.danger)));
        x2.on('pointerout', () => x2.setColor(hex(COLORS.muted)));
        this.dyn.add(x2);
      }
    }
  }
}
