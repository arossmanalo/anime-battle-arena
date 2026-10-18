import type { FighterDef, SkillDef } from '../sim/types';

const none: SkillDef = {
  id: 'dummy.none',
  name: 'None',
  kind: 'buff',
  energyCost: 0,
  cooldown: 1,
  castTime: 0,
  range: 0,
  effects: [],
  color: 0,
};

/** What the dummy throws at the player in its 'attack' mode: a small hit that goes through barriers, dodges and shields. */
export const DUMMY_POKE: SkillDef = {
  id: 'dummy.poke',
  name: 'Poke',
  kind: 'aoe',
  energyCost: 0,
  cooldown: 1,
  castTime: 0,
  range: 0,
  effects: [{ type: 'damage', amount: 6 }],
  color: 0xe8553a,
};

/** The training dummy: a bullseye ball that stands there and takes it. Not part of the roster. */
export const TRAINING_DUMMY: FighterDef = {
  id: 'dummy',
  name: 'Training Dummy',
  series: 'Training',
  initials: '',
  color: 0xe8553a,
  accent: 0xffffff,
  hp: 100000,
  speed: 0,
  radius: 22,
  energyRegen: 0,
  aiProfile: 'balanced',
  skills: [none, none, none, none],
  ultimate: { ...none, id: 'dummy.ultimate', ultimate: true },
  attack: { name: 'None', style: 'melee', damage: 0, range: 0, cooldown: 99, windup: 1, combo: 1, color: 0 },
  passive: { id: 'dummy.passive', name: 'None', description: '', kind: 'rage', maxBonus: 0 },
  voiceLines: { intro: [], ultimate: [], transform: [], hurt: [], win: [] },
};
