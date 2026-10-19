import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from '../game/layout';
import type { MatchResult, MatchSetup } from '../game/match';
import { BattleScene } from '../game/scenes/BattleScene';
import { BootScene } from '../game/scenes/BootScene';
import { PreloadScene } from '../game/scenes/PreloadScene';

export interface BattleHost {
  game: Phaser.Game;
  pause: () => void;
  quit: () => void;
  destroy: () => void;
}

/** Starts the Phaser battle inside `parent` and reports the end of the match. Boot and Preload run first, then Battle. */
export function startBattle(parent: HTMLElement, setup: MatchSetup, on: { ready: () => void; result: (r: MatchResult) => void; quit: () => void }): BattleHost {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH * RENDER_SCALE,
    height: GAME_HEIGHT * RENDER_SCALE,
    render: { antialias: true },
    // Timer-driven loop: background tabs still tick (about once a second) instead of stopping with requestAnimationFrame.
    fps: { forceSetTimeOut: true },
    backgroundColor: '#07070d',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, PreloadScene, BattleScene],
    callbacks: {
      preBoot: (g) => {
        g.registry.set('launch', { scene: 'Battle', data: setup });
        // Keep the match running when the tab or window loses focus (Phaser would otherwise pause the whole loop).
        (g as unknown as { onHidden: () => void }).onHidden = () => {};
      },
    },
  });
  game.events.on('aba:result', on.result);
  game.events.on('aba:quit', on.quit);
  // The canvas is created right away; "ready" fires once the Battle scene has started.
  const check = window.setInterval(() => {
    if (game.scene.isActive('Battle')) {
      window.clearInterval(check);
      on.ready();
    }
  }, 120);
  if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
  return {
    game,
    pause: () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27 })),
    quit: () => game.events.emit('aba:quit'),
    destroy: () => {
      window.clearInterval(check);
      game.destroy(true);
    },
  };
}
