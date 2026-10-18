import type { Fighter } from './Fighter';
import type { Effect, SkillDef } from './types';
import type { EffectContext } from './effects';
import { takeDamage } from './effects';

const HOSTILE: Effect['type'][] = ['damage', 'knockback', 'stun', 'burn', 'slow'];
/** How long one attack's block/evade verdict is reused, so a beam or zone ticking every ~0.1s counts as one attack. */
const DECISION_WINDOW = 0.35;

/** Per-tick upkeep: barrier recharge, conditional regeneration, expiring verdicts. */
export function tickPassive(f: Fighter, dt: number): void {
  const p = f.def.passive;
  const state = f.passive;
  if (state.marks > 0 && (state.markTimer -= dt) <= 0) state.marks = 0;
  for (const [key, d] of state.decided) {
    d.remaining -= dt;
    if (d.remaining <= 0) state.decided.delete(key);
  }
  if (p.kind === 'barrier' && state.hitsLeft <= 0 && state.recharge > 0) {
    state.recharge -= dt;
    if (state.recharge <= 0) {
      state.hitsLeft = p.hits;
      state.procs.push('recharged');
    }
  } else if (p.kind === 'regen' && f.hp <= f.maxHp * p.belowHp) {
    f.hp = Math.min(f.maxHp, f.hp + p.hpPerSec * dt);
  }
}

/**
 * True if this fighter's passive stops an incoming attack entirely (no damage, no stun, no knockback).
 * `key` identifies one attack (attacker + skill). `roll` is the sim's deterministic damage roll, [0.9, 1.1].
 */
export function negatesAttack(f: Fighter, effects: Effect[], key: string, roll: () => number): boolean {
  const p = f.def.passive;
  if ((p.kind !== 'barrier' && p.kind !== 'dodge') || !effects.some((e) => HOSTILE.includes(e.type))) return false;
  const state = f.passive;
  const earlier = state.decided.get(key);
  if (earlier) {
    earlier.remaining = DECISION_WINDOW;
    return earlier.blocked;
  }
  let blocked = false;
  if (p.kind === 'barrier' && state.hitsLeft > 0) {
    blocked = true;
    if (--state.hitsLeft === 0) state.recharge = p.cooldown;
  } else if (p.kind === 'dodge') {
    blocked = (roll() - 0.9) / 0.2 < p.chance;
  }
  state.decided.set(key, { blocked, remaining: DECISION_WINDOW });
  if (blocked) state.procs.push(p.kind === 'barrier' ? 'block' : 'dodge');
  return blocked;
}

/** Called with the HP a hit is about to remove. Returns how much HP is actually lost. */
export function survivesHit(f: Fighter, lost: number): number {
  const p = f.def.passive;
  if (p.kind !== 'lastStand' || f.passive.used || lost < f.hp) return lost;
  f.passive.used = true;
  f.invuln = Math.max(f.invuln, p.invuln);
  f.passive.procs.push('lastStand');
  return f.hp - 1;
}

export function passiveDamageMult(f: Fighter): number {
  const p = f.def.passive;
  return p.kind === 'rage' ? 1 + p.maxBonus * (1 - f.hp / f.maxHp) : 1;
}

export function passiveUltMult(f: Fighter): number {
  const p = f.def.passive;
  return p.kind === 'ultCharge' ? p.mult : 1;
}

/** The extra hit a consumed set of marks deals. Shown like any other hit (damage number, sound). */
export const CURSE_BURST: SkillDef = {
  id: 'curse.burst',
  name: 'Curse Burst',
  kind: 'aoe',
  energyCost: 0,
  cooldown: 1,
  castTime: 0,
  range: 0,
  effects: [],
  color: 0xff3a4a,
};

/**
 * marks passive: called after `source` damaged `target` with `skill`. Marks stack on the target; hitting a fully
 * marked target consumes them for bonus damage. Only projectiles, dashes, area hits and default attacks mark, so a
 * domain's many ticks can't burst on every tick.
 */
export function applyMarks(ctx: EffectContext, source: Fighter, target: Fighter, skill: SkillDef): void {
  const p = source.def.passive;
  if (p.kind !== 'marks' || source === target || !target.alive) return;
  if (!['projectile', 'dash', 'aoe'].includes(skill.kind) || skill.id === CURSE_BURST.id) return;
  const state = target.passive;
  if (state.marks >= p.stacks) {
    state.marks = 0;
    const dealt = takeDamage(target, Math.round(p.bonus * source.damageMult));
    source.stats.damageDealt += dealt;
    target.stats.damageTaken += dealt;
    ctx.onHit(source, target, dealt, CURSE_BURST);
  } else {
    state.marks++;
    state.markTimer = p.expire;
  }
}
