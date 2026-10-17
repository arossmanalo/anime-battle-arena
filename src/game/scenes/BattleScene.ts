import Phaser from 'phaser';
import { ARENA_HEIGHT, ARENA_WIDTH, ARENA_X, ARENA_Y } from '../layout';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle');
  }

  create(): void {
    const g = this.add.graphics();
    g.fillStyle(0x2a2d3a).fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT);
    g.lineStyle(2, 0x5a6075).strokeRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT);
  }
}
