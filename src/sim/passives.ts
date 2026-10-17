import type { Fighter } from './Fighter';
import type { Effect } from './types';

const HOSTILE: Effect['type'][] = ['damage', 'knockback', 'stun', 'burn', 'slow'];
/** How long one attack's block/evade verdict is reused, so a beam or zone ticking every ~0.1s counts as one attack. */
const DECISION_WINDOW = 0.35;

/** Per-tick upkeep: barrier recharge, conditional regeneration, expiring verdicts. */
export function tickPassive(f: Fighter, dt: number): void {
  const p = f.def.passive;
  const state = f.passive;
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
