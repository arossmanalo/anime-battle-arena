import Phaser from 'phaser';
import { fighterById } from '../../data/fighters';
import { sfx } from '../audio/Sfx';
import { GAME_HEIGHT, GAME_WIDTH, fitCamera } from '../layout';
import { newSeed, type MatchResult } from '../match';
import { COLORS, hex, impactStyle, textStyle } from '../theme';
import { makePortrait } from '../view/portrait';

export class ResultsScene extends Phaser.Scene {
  private result!: MatchResult;

  constructor() {
    super('Results');
  }

  init(result: MatchResult): void {
    this.result = result;
  }

  /** Team battles: one row per fighter on each side with damage, healing and role. */
  private teamTable(r: MatchResult): void {
    const cx = GAME_WIDTH / 2;
    for (const team of [0, 1]) {
      const x0 = team === 0 ? 40 : cx + 20;
      const rows = r.fighters.filter((f) => f.team === team);
      const won = team === r.winnerTeam;
      this.add.rectangle(x0 + 205, 255, 410, 230, COLORS.panel).setStrokeStyle(won ? 3 : 1, won ? COLORS.ult : COLORS.border);
      this.add.text(x0 + 205, 152, `${team === 0 ? 'YOUR TEAM' : 'ENEMY TEAM'}${won ? '  ·  WINNER' : ''}`, impactStyle(16, won ? COLORS.ult : COLORS.text)).setOrigin(0.5);
      this.add.text(x0 + 130, 172, 'HP', textStyle(10, COLORS.muted));
      this.add.text(x0 + 215, 172, 'DAMAGE', textStyle(10, COLORS.muted));
      this.add.text(x0 + 300, 172, 'HEALING', textStyle(10, COLORS.muted));
      rows.forEach((f, i) => {
        const y = 190 + i * 46;
        makePortrait(this, x0 + 28, y + 18, 34, fighterById(f.id));
        this.add.text(x0 + 52, y + 4, f.name.toUpperCase(), impactStyle(12));
        this.add.text(x0 + 52, y + 20, f.hpLeft > 0 ? 'alive' : 'KO', textStyle(10, f.hpLeft > 0 ? COLORS.hp : COLORS.danger));
        this.add.text(x0 + 130, y + 10, `${f.hpLeft}/${f.maxHp}`, textStyle(12, COLORS.text));
        this.add.text(x0 + 215, y + 10, String(f.damageDealt), textStyle(13, COLORS.text, { fontStyle: 'bold' }));
        this.add.text(x0 + 300, y + 10, String(f.healing ?? 0), textStyle(13, 0x7dff9a, { fontStyle: 'bold' }));
      });
    }
  }

  create(): void {
    fitCamera(this.cameras.main);
    const r = this.result;
    const cx = GAME_WIDTH / 2;
    const playerWon = r.winnerTeam === 0;
    const isTeam = !!r.setup.team;
    const headline = r.winnerTeam === -1 ? 'DRAW' : playerWon ? 'VICTORY' : 'DEFEAT';
    const color = r.winnerTeam === -1 ? COLORS.muted : playerWon ? COLORS.ult : COLORS.danger;
    this.add.text(cx, 56, headline, impactStyle(56, color)).setOrigin(0.5);
    this.add
      .text(cx, 100, `${r.reason === 'ko' ? 'Knockout' : 'Time out'} · ${r.duration.toFixed(1)}s`, textStyle(14, COLORS.muted))
      .setOrigin(0.5);

    if (isTeam) this.teamTable(r);
    else r.fighters.forEach((f, i) => {
      const x = i === 0 ? cx - 200 : cx + 200;
      const won = i === r.winnerTeam;
      this.add.rectangle(x, 255, 300, 230, COLORS.panel).setStrokeStyle(won ? 3 : 1, won ? COLORS.ult : COLORS.border);
      makePortrait(this, x, 185, 72, fighterById(f.id));
      this.add.text(x, 238, `${f.name.toUpperCase()}${i === 0 ? ' (YOU)' : ' (CPU)'}`, impactStyle(20)).setOrigin(0.5);
      const rows = [
        ['HP left', `${f.hpLeft} / ${f.maxHp}`],
        ['Damage dealt', String(f.damageDealt)],
        ['Hits landed', String(f.hits)],
        ['Skills used', String(f.skillsUsed)],
        ['Transformed', f.transformed ? 'Yes' : 'No'],
      ];
      rows.forEach(([k, v], j) => {
        this.add.text(x - 120, 262 + j * 18, k, textStyle(13, COLORS.muted));
        this.add.text(x + 120, 262 + j * 18, v, textStyle(13, COLORS.text, { fontStyle: 'bold' })).setOrigin(1, 0);
      });
      if (won) this.add.text(x, 140, 'WINNER', impactStyle(16, COLORS.ult)).setOrigin(0.5);
    });

    const buttons: [string, () => void][] = [
      ['REMATCH', () => this.scene.start('Battle', { ...r.setup, seed: newSeed() })],
      ['CHANGE FIGHTERS', () => this.scene.start(isTeam ? 'TeamSelect' : 'CharacterSelect', r.setup)],
      ['MAIN MENU', () => this.scene.start('MainMenu')],
    ];
    buttons.forEach(([label, fn], i) => {
      const t = this.add
        .text(cx + (i - 1) * 220, GAME_HEIGHT - 70, label, impactStyle(22, i === 0 ? COLORS.ult : COLORS.text))
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor(hex(COLORS.ult)));
      t.on('pointerout', () => t.setColor(hex(i === 0 ? COLORS.ult : COLORS.text)));
      t.on('pointerdown', () => {
        sfx(this).play('click');
        fn();
      });
    });
    this.add.text(cx, GAME_HEIGHT - 32, 'ENTER rematch · ESC change fighters', textStyle(11, COLORS.muted)).setOrigin(0.5);
    this.input.keyboard?.once('keydown-ENTER', buttons[0][1]);
    this.input.keyboard?.once('keydown-ESC', buttons[1][1]);
  }
}
