import Phaser from 'phaser';
import { ROSTER } from '../../data/fighters';
import { GAME_HEIGHT, GAME_WIDTH, fitCamera } from '../layout';
import { COLORS, impactStyle, textStyle } from '../theme';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    fitCamera(this.cameras.main);
    const cx = GAME_WIDTH / 2;

    // Drifting fighter-coloured embers behind the title.
    this.add.particles(0, 0, 'spark', {
      x: { min: 0, max: GAME_WIDTH },
      y: GAME_HEIGHT + 10,
      speedY: { min: -90, max: -40 },
      speedX: { min: -15, max: 15 },
      lifespan: 6000,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: ROSTER.map((f) => f.color),
      frequency: 60,
      blendMode: 'ADD',
    });

    const title = this.add.text(cx, 150, 'ANIME BATTLE ARENA', impactStyle(64, 0xffffff, 0x1b1b2e)).setOrigin(0.5);
    title.setShadow(0, 6, '#ff6a00', 0, true, true);
    this.tweens.add({ targets: title, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.add
      .text(cx, 215, 'Auto-battle simulator. You call the skills.', textStyle(18, COLORS.muted))
      .setOrigin(0.5);

    const start = this.add
      .text(cx, 320, 'PRESS ENTER OR CLICK TO START', impactStyle(26, COLORS.ult))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: start, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

    const teamBtn = this.add
      .text(cx, 350, 'TEAM BATTLE  (B)', impactStyle(20, 0xff9a5a))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    teamBtn.on('pointerover', () => teamBtn.setScale(1.06));
    teamBtn.on('pointerout', () => teamBtn.setScale(1));

    const training = this.add
      .text(cx, 392, 'TRAINING MODE  (T)', impactStyle(20, COLORS.energy))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    training.on('pointerover', () => training.setScale(1.06));
    training.on('pointerout', () => training.setScale(1));
    this.add.text(cx, 418, 'a dummy to test any move on, with infinite energy', textStyle(12, COLORS.muted)).setOrigin(0.5);

    this.add
      .text(
        cx,
        GAME_HEIGHT - 40,
        'Fan-made, non-commercial project. All characters belong to their respective owners.',
        textStyle(12, COLORS.muted),
      )
      .setOrigin(0.5);

    const go = () => this.scene.start('CharacterSelect');
    const train = () => this.scene.start('CharacterSelect', { training: true });
    this.input.keyboard?.once('keydown-ENTER', go);
    this.input.keyboard?.once('keydown-SPACE', go);
    const teams = () => this.scene.start('TeamSelect');
    this.input.keyboard?.once('keydown-T', train);
    this.input.keyboard?.once('keydown-B', teams);
    training.once('pointerdown', train);
    teamBtn.once('pointerdown', teams);
    // Clicking anywhere else starts a normal match.
    this.input.once('pointerdown', (_p: Phaser.Input.Pointer, over: unknown[]) => {
      if (!over.includes(training) && !over.includes(teamBtn)) go();
    });
  }
}
