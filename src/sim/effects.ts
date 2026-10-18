import type { Fighter, StatusType } from './Fighter';
import type { Effect, SkillDef, Vec } from './types';
import { applyMarks, negatesAttack, passiveUltMult, survivesHit } from './passives';
import { norm, scale, sub } from './vec';

/** Energy gained per point of damage dealt / taken. */
export const ENERGY_ON_DEAL = 0.35;
export const ENERGY_ON_TAKE = 0.25;
/** Ultimate meter gained per point of damage dealt / taken, and per second passively. */
export const ULT_ON_DEAL = 0.2;
export const ULT_ON_TAKE = 0.3;
export const ULT_REGEN = 1;
const KNOCKBACK_TAKEN_MULT = 1;

export interface EffectContext {
  /** Random multiplier for damage rolls, in [0.9, 1.1]. Injected so effects stay deterministic. */
  roll: () => number;
  /** Match-wide multiplier on healing (weakens over time in team matches). */
  healMult?: () => number;
  /** Match-wide multiplier on damage taken (rises over time in team matches). */
  defenseMult?: () => number;
  onHeal?: (source: Fighter, target: Fighter, amount: number) => void;
  onHit: (source: Fighter, target: Fighter, damage: number, skill: SkillDef) => void;
}

function addStatus(target: Fighter, type: StatusType, remaining: number, value: number, source: number): void {
  // Re-applying a status refreshes it instead of stacking duplicates.
  const existing = target.statuses.find((s) => s.type === type && s.source === source);
  if (existing) {
    existing.remaining = Math.max(existing.remaining, remaining);
    existing.value = type === 'shield' ? existing.value + value : value;
    return;
  }
  target.statuses.push({ type, remaining, value, source });
}

/** Applies damage after shields. Returns the HP actually lost. */
export function takeDamage(target: Fighter, amount: number, pierce = 0): number {
  if (target.invuln > 0 || !target.alive) return 0;
  // Piercing damage skips shields; the rest is absorbed as usual.
  const direct = amount * pierce;
  let left = amount - direct;
  for (const s of target.statuses) {
    if (s.type !== 'shield' || left <= 0) continue;
    const absorbed = Math.min(s.value, left);
    s.value -= absorbed;
    left -= absorbed;
  }
  target.statuses = target.statuses.filter((s) => s.type !== 'shield' || s.value > 0);
  left += direct;
  const lost = survivesHit(target, Math.min(target.hp, left));
  target.hp -= lost;
  return lost;
}

export function gainEnergy(f: Fighter, amount: number): void {
  f.energy = Math.min(f.maxEnergy, f.energy + amount);
}

export function gainUlt(f: Fighter, amount: number): void {
  f.ult = Math.min(f.maxUlt, f.ult + amount * passiveUltMult(f));
}

/**
 * Applies a skill's effects from `source` to `target`. `origin` is where the hit came from
 * (used for knockback direction). Self-targeted effects go through the same function with target === source.
 */
export function applyEffects(
  ctx: EffectContext,
  source: Fighter,
  target: Fighter,
  effects: Effect[],
  skill: SkillDef,
  origin: Vec,
): void {
  const self = source === target;
  if (!self && (target.invuln > 0 || !target.alive)) return;
  if (!self && negatesAttack(target, effects, `${source.uid}:${skill.id}`, ctx.roll)) return;

  for (const e of effects) {
    switch (e.type) {
      case 'damage': {
        const taken = target.statusMult('guard') * (ctx.defenseMult?.() ?? 1);
        const dealt = takeDamage(target, Math.round(e.amount * source.damageMult * ctx.roll() * taken), e.pierce);
        if (dealt > 0) {
          source.stats.damageDealt += dealt;
          source.stats.hits += 1;
          target.stats.damageTaken += dealt;
          gainEnergy(source, dealt * ENERGY_ON_DEAL);
          gainEnergy(target, dealt * ENERGY_ON_TAKE);
          gainUlt(source, dealt * ULT_ON_DEAL);
          gainUlt(target, dealt * ULT_ON_TAKE);
        }
        ctx.onHit(source, target, dealt, skill);
        if (dealt > 0) applyMarks(ctx, source, target, skill);
        break;
      }
      case 'knockback': {
        const dir = norm(sub(target.pos, origin));
        target.knock = scale(dir, e.force * KNOCKBACK_TAKEN_MULT);
        break;
      }
      case 'stun':
        // A move that can't be interrupted (a domain being opened) shrugs stuns off while it winds up.
        if (target.casting?.skill.uninterruptible) break;
        addStatus(target, 'stun', e.duration, 0, source.uid);
        // A stun interrupts wind-ups and channels.
        target.casting = null;
        target.channel = null;
        target.swing = null;
        break;
      case 'burn':
        addStatus(target, 'burn', e.duration, e.dps, source.uid);
        break;
      case 'slow':
        addStatus(target, 'slow', e.duration, e.factor, source.uid);
        break;
      case 'shield':
        addStatus(target, 'shield', e.duration, e.amount, source.uid);
        break;
      case 'heal': {
        const before = target.hp;
        target.hp = Math.min(target.maxHp, target.hp + Math.round(e.amount * (ctx.healMult?.() ?? 1)));
        if (target.hp > before) {
          source.stats.healingDone += target.hp - before;
          ctx.onHeal?.(source, target, target.hp - before);
        }
        break;
      }
      case 'taunt':
        addStatus(target, 'taunt', e.duration, source.uid, source.uid);
        break;
      case 'guard':
        addStatus(target, 'guard', e.duration, e.factor, source.uid);
        break;
      case 'cleanse':
        target.statuses = target.statuses.filter((s) => s.type !== 'stun' && s.type !== 'burn' && s.type !== 'slow');
        break;
      case 'speedBuff':
        addStatus(target, 'speedBuff', e.duration, e.factor, source.uid);
        break;
      case 'damageBuff':
        addStatus(target, 'damageBuff', e.duration, e.factor, source.uid);
        break;
    }
  }
}

/** Total direct damage a skill deals per application, ignoring multipliers. */
export function baseDamage(skill: SkillDef): number {
  return skill.effects.reduce((sum, e) => sum + (e.type === 'damage' ? e.amount : 0), 0);
}
