import type { FighterDef } from '../../sim/types';
import { gojo } from './gojo';
import { goku } from './goku';
import { naruto } from './naruto';
import { nezuko } from './nezuko';
import { sasuke } from './sasuke';
import { sukuna } from './sukuna';
import { tanjiro } from './tanjiro';
import { vegeta } from './vegeta';

/** Playable roster, in Character Select order. Add a fighter by adding a data file and listing it here. */
export const ROSTER: FighterDef[] = [naruto, sasuke, goku, vegeta, gojo, tanjiro, sukuna, nezuko];

export function fighterById(id: string): FighterDef {
  const def = ROSTER.find((f) => f.id === id);
  if (!def) throw new Error(`Unknown fighter: ${id}`);
  return def;
}
