import Phaser from 'phaser';
import { BattleScene } from './game/scenes/BattleScene';
import { GAME_HEIGHT, GAME_WIDTH } from './game/layout';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b0b12',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BattleScene],
});
