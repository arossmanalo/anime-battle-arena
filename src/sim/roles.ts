import type { FighterDef, Role, RoleScores } from './types';

const ROLES: Role[] = ['tank', 'damage', 'support'];

/** A fighter's role scores, with `damage: 1` for fighters that don't list any. */
export function roleScores(def: Pick<FighterDef, 'roles'>): Record<Role, number> {
  const r: RoleScores = def.roles ?? {};
  const out = { tank: r.tank ?? 0, damage: r.damage ?? 0, support: r.support ?? 0 };
  if (ROLES.every((k) => out[k] === 0)) out.damage = 1;
  return out;
}

/** The role a fighter is mostly there to play (ties go tank > support > damage). */
export function mainRole(def: Pick<FighterDef, 'roles'>): Role {
  const s = roleScores(def);
  return (['tank', 'support', 'damage'] as Role[]).reduce((best, k) => (s[k] > s[best] ? k : best), 'damage' as Role);
}
