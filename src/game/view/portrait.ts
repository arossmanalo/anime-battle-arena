import Phaser from 'phaser';
import type { FighterDef } from '../../sim/types';
import { impactStyle, shade } from '../theme';

/**
 * A square fighter portrait. Uses the `portrait_<id>` texture when one has been loaded,
 * otherwise a placeholder built from the fighter's colours and initials.
 */
export function makePortrait(scene: Phaser.Scene, x: number, y: number, size: number, def: FighterDef): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, size, size, shade(def.color, -0.55)).setStrokeStyle(2, def.accent);
  c.add(bg);

  const key = `portrait_${def.id}`;
  if (scene.textures.exists(key)) {
    c.add(scene.add.image(0, 0, key).setDisplaySize(size - 4, size - 4));
  } else {
    c.add(scene.add.circle(0, size * 0.08, size * 0.36, def.color).setStrokeStyle(Math.max(2, size / 20), def.accent));
    c.add(scene.add.text(0, size * 0.08, def.initials, impactStyle(Math.round(size * 0.3), 0xffffff)).setOrigin(0.5));
  }
  return c;
}
