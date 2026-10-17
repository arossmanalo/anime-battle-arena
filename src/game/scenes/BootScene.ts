import Phaser from 'phaser';

/**
 * Generates the small shared textures (particles, glows) at runtime so the game runs with zero art files.
 * Real art and audio are loaded afterwards by the Preload scene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const g = this.make.graphics({}, false);

    // Soft round particle.
    for (let r = 8; r > 0; r--) {
      g.fillStyle(0xffffff, (1 - r / 8) * 0.9 + 0.1);
      g.fillCircle(8, 8, r);
    }
    g.generateTexture('spark', 16, 16);
    g.clear();

    // Large radial glow for auras and charge-ups.
    for (let r = 64; r > 0; r -= 2) {
      g.fillStyle(0xffffff, 0.04 + (1 - r / 64) * 0.08);
      g.fillCircle(64, 64, r);
    }
    g.generateTexture('glow', 128, 128);
    g.clear();

    // Hard-edged shard for impact debris.
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(0, 3, 10, 0, 10, 6);
    g.generateTexture('shard', 10, 6);
    g.destroy();

    this.scene.start('Preload');
  }
}
