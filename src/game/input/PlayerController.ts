import Phaser from 'phaser';
import type { Fighter } from '../../sim/Fighter';
import type { Simulation } from '../../sim/Simulation';
import type { CastFailReason, SkillSlot } from '../../sim/types';
import type { BarAction, SkillBar } from '../hud/SkillBar';

const KEY_TO_SLOT: Record<string, SkillSlot> = { ONE: 0, TWO: 1, THREE: 2, FOUR: 3, U: 4 };

/** Turns hotkeys and skill-bar clicks into sim commands for the player's fighter. */
export class PlayerController {
  private lastAction: BarAction | null = null;
  enabled = false;

  constructor(
    scene: Phaser.Scene,
    private readonly sim: Simulation,
    private readonly f: Fighter,
    private readonly bar: SkillBar,
  ) {
    const kb = scene.input.keyboard;
    if (!kb) return;
    for (const [key, slot] of Object.entries(KEY_TO_SLOT)) {
      kb.on(`keydown-${key}`, () => this.act({ kind: 'skill', slot }));
    }
    // Numpad digits too.
    (['NUMPAD_ONE', 'NUMPAD_TWO', 'NUMPAD_THREE', 'NUMPAD_FOUR'] as const).forEach((k, i) =>
      kb.on(`keydown-${k}`, () => this.act({ kind: 'skill', slot: i as SkillSlot })),
    );
    kb.on('keydown-T', () => this.act({ kind: 'transform' }));
    kb.on('keydown-A', () => this.act({ kind: 'auto' }));
  }

  act(action: BarAction): void {
    if (!this.enabled || this.sim.over) return;
    this.lastAction = action;
    switch (action.kind) {
      case 'skill':
        this.sim.command({ type: 'castSkill', uid: this.f.uid, slot: action.slot });
        break;
      case 'transform':
        this.sim.command({ type: 'transform', uid: this.f.uid });
        break;
      case 'auto':
        this.sim.command({ type: 'setAuto', uid: this.f.uid, auto: !this.f.auto });
        break;
    }
  }

  onCastFailed(reason: CastFailReason): void {
    if (this.lastAction) this.bar.flashFail(this.lastAction, reason);
  }
}
