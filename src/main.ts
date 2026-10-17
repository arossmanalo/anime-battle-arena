import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from './game/layout';
import { BattleScene } from './game/scenes/BattleScene';
import { BootScene } from './game/scenes/BootScene';
import { CharacterSelectScene } from './game/scenes/CharacterSelectScene';
import { MainMenuScene } from './game/scenes/MainMenuScene';
import { PreloadScene } from './game/scenes/PreloadScene';
import { ResultsScene } from './game/scenes/ResultsScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // The canvas is rendered at RENDER_SCALE x the layout size; each scene's camera zooms to match.
  width: GAME_WIDTH * RENDER_SCALE,
  height: GAME_HEIGHT * RENDER_SCALE,
  render: { antialias: true },
  backgroundColor: '#0b0b12',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, PreloadScene, MainMenuScene, CharacterSelectScene, BattleScene, ResultsScene],
});

// Handy for debugging from the browser console during development.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
