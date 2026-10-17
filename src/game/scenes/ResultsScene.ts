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

  create(): void {
    fitCamera(this.cameras.main);
    const r = this.result;
    const cx = GAME_WIDTH / 2;
    const playerWon = r.winnerTeam === 0;
    const headline = r.winnerTeam === -1 ? 'DRAW' : playerWon ? 'VICTORY' : 'DEFEAT';
    const color = r.winnerTeam === -1 ? COLORS.muted : playerWon ? COLORS.ult : COLORS.danger;
    this.add.text(cx, 56, headline, impactStyle(56, color)).setOrigin(0.5);
    this.add
      .text(cx, 100, `${r.reason === 'ko' ? 'Knockout' : 'Time out'} · ${r.duration.toFixed(1)}s`, textStyle(14, COLORS.muted))
      .setOrigin(0.5);

    r.fighters.forEach((f, i) => {
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
      ['CHANGE FIGHTERS', () => this.scene.start('CharacterSelect', r.setup)],
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
