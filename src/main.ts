import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './game/layout';
import { BattleScene } from './game/scenes/BattleScene';
import { BootScene } from './game/scenes/BootScene';
import { CharacterSelectScene } from './game/scenes/CharacterSelectScene';
import { MainMenuScene } from './game/scenes/MainMenuScene';
import { ResultsScene } from './game/scenes/ResultsScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b0b12',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, MainMenuScene, CharacterSelectScene, BattleScene, ResultsScene],
});

// Handy for debugging from the browser console during development.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
