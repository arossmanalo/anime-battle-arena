import Phaser from 'phaser';
import { ROSTER } from '../../data/fighters';
import type { Difficulty, FighterDef } from '../../sim/types';
import { sfx } from '../audio/Sfx';
import { GAME_HEIGHT, GAME_WIDTH, fitCamera } from '../layout';
import { newSeed, type MatchSetup } from '../match';
import { COLORS, hex, impactStyle, shade, textStyle } from '../theme';
import { makePortrait } from '../view/portrait';

type Slot = 'player' | 'enemy';

// Up to 6 fighters fit in 3 columns; with more, 4 narrower columns keep the grid to 2 rows.
const GRID_COLS = ROSTER.length > 6 ? 4 : 3;
const CARD_W = GRID_COLS === 4 ? 104 : 124;
const CARD_H = 112;
const GRID_GAP = GRID_COLS === 4 ? 8 : 10;
const GRID_X = GAME_WIDTH / 2 - ((CARD_W + GRID_GAP) * GRID_COLS - GRID_GAP) / 2 + CARD_W / 2;
const GRID_Y = 150;
const PANEL_W = 230;

const PROFILE_LABEL = { rushdown: 'Rushdown', balanced: 'All-rounder', zoner: 'Zoner' } as const;

export class CharacterSelectScene extends Phaser.Scene {
  private picks: Record<Slot, FighterDef> = { player: ROSTER[0], enemy: ROSTER[2 % ROSTER.length] };
  private active: Slot = 'player';
  private difficulty: Difficulty = 'normal';
  /** Training mode: pick one fighter, the opponent is the dummy. */
  private training = false;
  private panels!: Record<Slot, Phaser.GameObjects.Container>;
  private cards: { def: FighterDef; frame: Phaser.GameObjects.Rectangle; tags: Phaser.GameObjects.Text }[] = [];
  private diffButtons: { d: Difficulty; t: Phaser.GameObjects.Text }[] = [];

  constructor() {
    super('CharacterSelect');
  }

  init(data: Partial<MatchSetup>): void {
    if (data.playerId) this.picks.player = ROSTER.find((f) => f.id === data.playerId) ?? this.picks.player;
    if (data.enemyId) this.picks.enemy = ROSTER.find((f) => f.id === data.enemyId) ?? this.picks.enemy;
    if (data.difficulty) this.difficulty = data.difficulty;
    this.training = !!data.training;
    this.active = 'player';
    this.cards = [];
    this.diffButtons = [];
  }

  create(): void {
    fitCamera(this.cameras.main);
    this.add.text(GAME_WIDTH / 2, 36, this.training ? 'TRAINING: CHOOSE YOUR FIGHTER' : 'CHOOSE YOUR FIGHTERS', impactStyle(34)).setOrigin(0.5);
    this.add
      .text(
        GAME_WIDTH / 2,
        70,
        this.training ? 'Pick a fighter to test. You fight a dummy with infinite energy.' : 'Pick your fighter, then the opponent. Click a side panel to change it.',
        textStyle(13, COLORS.muted),
      )
      .setOrigin(0.5);

    ROSTER.forEach((def, i) => {
      const x = GRID_X + (i % GRID_COLS) * (CARD_W + GRID_GAP);
      const y = GRID_Y + Math.floor(i / GRID_COLS) * (CARD_H + 10);
      const frame = this.add
        .rectangle(x, y, CARD_W, CARD_H, COLORS.panel)
        .setStrokeStyle(2, COLORS.border)
        .setInteractive({ useHandCursor: true });
      makePortrait(this, x, y - 14, 64, def);
      this.add.text(x, y + 32, def.name.toUpperCase(), impactStyle(16)).setOrigin(0.5);
      this.add.text(x, y + 48, def.series, textStyle(10, COLORS.muted)).setOrigin(0.5);
      const tags = this.add.text(x - CARD_W / 2 + 4, y - CARD_H / 2 + 3, '', textStyle(10, 0xffffff, { fontStyle: 'bold' }));
      frame.on('pointerover', () => frame.setFillStyle(COLORS.panelLight));
      frame.on('pointerout', () => frame.setFillStyle(COLORS.panel));
      frame.on('pointerdown', () => this.pick(def));
      this.cards.push({ def, frame, tags });
    });

    this.panels = {
      player: this.add.container(20 + PANEL_W / 2, 300),
      enemy: this.add.container(GAME_WIDTH - 20 - PANEL_W / 2, 300),
    };

    // Difficulty (not in training: the dummy doesn't fight back)
    const dy = GRID_Y + 2 * (CARD_H + 10) + 10;
    if (!this.training) this.add.text(GAME_WIDTH / 2, dy, 'CPU DIFFICULTY', textStyle(12, COLORS.muted)).setOrigin(0.5);
    (this.training ? [] : (['easy', 'normal', 'hard'] as Difficulty[])).forEach((d, i) => {
      const t = this.add
        .text(GAME_WIDTH / 2 + (i - 1) * 100, dy + 26, d.toUpperCase(), impactStyle(18))
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        this.difficulty = d;
        this.refresh();
      });
      this.diffButtons.push({ d, t });
    });

    const fight = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 50, this.training ? 'START TRAINING' : 'FIGHT!', impactStyle(this.training ? 34 : 40, COLORS.ult))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    fight.on('pointerover', () => fight.setScale(1.08));
    fight.on('pointerout', () => fight.setScale(1));
    fight.on('pointerdown', () => this.startMatch());
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 18, 'or press ENTER', textStyle(11, COLORS.muted)).setOrigin(0.5);

    this.input.keyboard?.on('keydown-ENTER', () => this.startMatch());
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MainMenu'));

    this.refresh();
  }

  private pick(def: FighterDef): void {
    sfx(this).play('click');
    this.picks[this.active] = def;
    if (this.active === 'player' && !this.training) this.active = 'enemy';
    this.refresh();
  }

  private startMatch(): void {
    sfx(this).play('click');
    const setup: MatchSetup = {
      playerId: this.picks.player.id,
      enemyId: this.picks.enemy.id,
      difficulty: this.difficulty,
      seed: newSeed(),
      ...(this.training ? { training: true } : {}),
    };
    this.scene.start('Battle', setup);
  }

  private refresh(): void {
    for (const { def, frame, tags } of this.cards) {
      const isP = this.picks.player === def;
      const isE = !this.training && this.picks.enemy === def;
      frame.setStrokeStyle(isP || isE ? 3 : 2, isP ? COLORS.energy : isE ? COLORS.danger : COLORS.border);
      tags.setText([isP ? 'YOU' : '', isE ? 'CPU' : ''].filter(Boolean).join(' / '));
      tags.setColor(isP ? hex(COLORS.energy) : hex(COLORS.danger));
    }
    for (const { d, t } of this.diffButtons) t.setColor(d === this.difficulty ? hex(COLORS.ult) : hex(COLORS.muted));
    this.drawPanel('player');
    this.drawPanel('enemy');
  }

  private drawDummyPanel(): void {
    const c = this.panels.enemy;
    c.removeAll(true);
    c.add(this.add.rectangle(0, 0, PANEL_W, 380, 0x2a1d1a).setStrokeStyle(1, COLORS.border));
    c.add(this.add.text(0, -170, 'DUMMY', impactStyle(18, COLORS.danger)).setOrigin(0.5));
    c.add(this.add.circle(0, -95, 44, 0xe8553a).setStrokeStyle(4, 0xffffff));
    c.add(this.add.circle(0, -95, 28, 0xffffff));
    c.add(this.add.circle(0, -95, 13, 0xe8553a));
    c.add(this.add.text(0, -30, 'TRAINING DUMMY', impactStyle(22)).setOrigin(0.5));
    const lines = [
      'Never fights back and can',
      "never be knocked out.",
      '',
      'You have infinite energy and',
      'a full ultimate meter, and you',
      'can use your form any time.',
      '',
      'In the fight:',
      'R  reset the field and stats',
      'C  skills with no cooldown',
      'D  dummy: still / pacing / strafing / attacking',
      'T  form on / off',
    ];
    c.add(this.add.text(-PANEL_W / 2 + 14, -2, lines.join('\n'), textStyle(12, COLORS.text, { lineSpacing: 3 })).setOrigin(0, 0));
  }

  private drawPanel(slot: Slot): void {
    if (this.training && slot === 'enemy') {
      this.drawDummyPanel();
      return;
    }
    const c = this.panels[slot];
    c.removeAll(true);
    const def = this.picks[slot];
    const isActive = this.active === slot;
    const accent = slot === 'player' ? COLORS.energy : COLORS.danger;

    const bg = this.add
      .rectangle(0, 0, PANEL_W, 380, shade(def.color, -0.8))
      .setStrokeStyle(isActive ? 3 : 1, isActive ? accent : COLORS.border)
      .setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => {
      this.active = slot;
      this.refresh();
    });
    c.add(bg);
    c.add(this.add.text(0, -170, slot === 'player' ? 'YOU' : 'CPU', impactStyle(18, accent)).setOrigin(0.5));
    c.add(makePortrait(this, 0, -105, 96, def));
    c.add(this.add.text(0, -40, def.name.toUpperCase(), impactStyle(24)).setOrigin(0.5));
    c.add(this.add.text(0, -16, `${def.series} · ${PROFILE_LABEL[def.aiProfile]}`, textStyle(11, COLORS.muted)).setOrigin(0.5));

    const lines = [
      `HP ${def.hp}   SPD ${def.speed}`,
      ...def.skills.map((s, i) => `${i + 1}  ${s.name}`),
      `U  ${def.ultimate.name}`,
      def.form ? `T  ${def.form.name}` : '',
    ];
    c.add(
      this.add
        .text(-PANEL_W / 2 + 14, 2, lines.join('\n'), textStyle(12, COLORS.text, { lineSpacing: 2, wordWrap: { width: PANEL_W - 24 } }))
        .setOrigin(0, 0),
    );
    c.add(
      this.add
        .text(-PANEL_W / 2 + 14, 140, `PASSIVE · ${def.passive.name.toUpperCase()}
${def.passive.description}`, textStyle(11, shade(def.color, 0.4), { lineSpacing: 2, wordWrap: { width: PANEL_W - 24 } }))
        .setOrigin(0, 0),
    );
    if (isActive) {
      const hint = this.add.text(PANEL_W / 2 - 12, -170, 'picking…', textStyle(11, accent)).setOrigin(1, 0.5);
      this.tweens.add({ targets: hint, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
      c.add(hint);
    }
  }
}
