import type { Fighter } from './Fighter';
import type { SkillDef, Vec } from './types';

export interface Projectile {
  id: number;
  owner: Fighter;
  skill: SkillDef;
  pos: Vec;
  vel: Vec;
  radius: number;
  ttl: number;
  /** Ricochets left, and the enemy it just hit (ignored until it has left them). */
  bouncesLeft: number;
  lastHit: number | null;
}

/** A channelled beam. It follows the caster's position but keeps the direction it was fired in. */
export interface Beam {
  id: number;
  owner: Fighter;
  skill: SkillDef;
  dir: Vec;
  length: number;
  halfWidth: number;
  remaining: number;
  tickTimer: number;
}

/** A persistent area (traps, storms, Domain Expansions) that re-applies its effects every tick. */
export interface Zone {
  id: number;
  owner: Fighter;
  skill: SkillDef;
  pos: Vec;
  radius: number;
  remaining: number;
  tickTimer: number;
}
