import type { AttackDef, FighterDef, SkillDef } from './types';

/** Multiplier on the damage of a combo's last hit, and on the recovery time after it. */
export const FINISHER_MULT = 1.5;
/** Seconds after a hit during which the next swing continues the combo. */
export const COMBO_WINDOW = 1.2;
/** Extra reach allowed when a swing lands, so a target that stepped back a little is still hit. */
export const REACH_LEEWAY = 12;

export const isFinisher = (a: AttackDef, comboIndex: number): boolean => comboIndex >= a.combo - 1;

const cache = new Map<string, SkillDef>();

/**
 * The attack expressed as a SkillDef, so it goes through the same effect pipeline as skills
 * (damage buffs, shields, passives, hit events). Cached: one per fighter and finisher state.
 */
export function attackSkill(def: FighterDef, finisher: boolean, a: AttackDef = def.attack): SkillDef {
  const key = `${def.id}:${a.name}:${finisher}`;
  let skill = cache.get(key);
  if (!skill) {
    const strong = finisher && a.combo > 1;
    const effects: SkillDef['effects'] = [{ type: 'damage', amount: a.damage * (strong ? FINISHER_MULT : 1) }];
    if (a.knockback && (strong || a.combo === 1)) effects.push({ type: 'knockback', force: a.knockback });
    skill = {
      id: `${def.id}.attack`,
      name: a.name,
      kind: a.style === 'ranged' ? 'projectile' : 'aoe',
      energyCost: 0,
      cooldown: a.cooldown,
      castTime: a.windup,
      range: a.range,
      speed: a.speed,
      radius: a.style === 'ranged' ? 6 : undefined,
      effects,
      color: a.color,
    };
    cache.set(key, skill);
  }
  return skill;
}
