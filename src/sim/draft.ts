import { roleScores } from './roles';
import type { FighterDef, Role } from './types';

export type TeamSize = 2 | 3 | 4;

/**
 * What a team of this size should cover, in role points. A hybrid fighter contributes its scores to several
 * roles, so "tank 1.0" can be one full tank or a half-tank plus a half-tank.
 */
export function roleTargets(size: TeamSize): Record<Role, number> {
  switch (size) {
    case 2:
      return { tank: 0.5, healer: 0.5, support: 0.3, damage: 1 };
    case 3:
      return { tank: 1, healer: 0.8, support: 0.3, damage: 1 };
    default:
      return { tank: 1, healer: 1, support: 0.7, damage: 1.2 };
  }
}

const ROLE_WEIGHT: Record<Role, number> = { tank: 1.3, healer: 1.4, support: 0.8, damage: 1 };

/** How well a team covers the role targets (higher = more balanced). */
export function teamCoverage(team: FighterDef[], size: TeamSize): number {
  const target = roleTargets(size);
  const have: Record<Role, number> = { tank: 0, healer: 0, support: 0, damage: 0 };
  for (const def of team) {
    const s = roleScores(def);
    for (const r of Object.keys(have) as Role[]) have[r] += s[r];
  }
  let score = 0;
  for (const r of Object.keys(target) as Role[]) score += ROLE_WEIGHT[r] * Math.min(1, have[r] / Math.max(0.01, target[r]));
  return score;
}

/**
 * The smart picker: chooses the fighter that most improves the team's role coverage, with a little
 * randomness so the CPU does not always draft the same team. `unavailable` are ids it may not take.
 */
export function pickForTeam(team: FighterDef[], pool: FighterDef[], size: TeamSize, next: () => number, unavailable: Set<string> = new Set()): FighterDef | undefined {
  const inTeam = new Set(team.map((d) => d.id));
  let best: FighterDef | undefined;
  let bestScore = -Infinity;
  for (const def of pool) {
    if (inTeam.has(def.id) || unavailable.has(def.id)) continue;
    const score = teamCoverage([...team, def], size) + next() * 0.45;
    if (score > bestScore) {
      bestScore = score;
      best = def;
    }
  }
  return best;
}

/** Fills a whole team from `pool`, starting from the fighters already in `team`. */
export function fillTeam(team: FighterDef[], pool: FighterDef[], size: TeamSize, next: () => number, unavailable: Set<string> = new Set()): FighterDef[] {
  const out = [...team];
  while (out.length < size) {
    const pick = pickForTeam(out, pool, size, next, unavailable);
    if (!pick) break;
    out.push(pick);
  }
  return out;
}

/** Snake draft order: true = the player picks. P C C P P C C P ... */
export function draftOrder(size: TeamSize): boolean[] {
  const order: boolean[] = [];
  for (let i = 0; i < size * 2; i++) order.push(Math.floor((i + 1) / 2) % 2 === 0);
  return order;
}

/** Largest team size a draft can fill from `rosterSize` fighters (each fighter can be on one team only). */
export function maxDraftSize(rosterSize: number): number {
  return Math.floor(rosterSize / 2);
}
