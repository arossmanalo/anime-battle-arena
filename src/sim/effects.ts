import type { Fighter, StatusType } from './Fighter';
import type { Effect, SkillDef, Vec } from './types';
import { applyMarks, awakenGain, awakenInterrupt, BRACE_COUNTER, negatesAttack, passiveDamageTaken, passiveKnockbackTaken, passiveUltMult, survivesHit } from './passives';
import { norm, scale, sub } from './vec';

/** Energy gained per point of damage dealt / taken. */
export const ENERGY_ON_DEAL = 0.35;
export const ENERGY_ON_TAKE = 0.25;
/** Ultimate meter gained per point of damage dealt / taken, and per second passively. */
export const ULT_ON_DEAL = 0.2;
export const ULT_ON_TAKE = 0.3;
export const ULT_REGEN = 1;
const KNOCKBACK_TAKEN_MULT = 1;
/** A braced fighter answers a close hit within this gap (px, between the two fighters' edges) with a stun and knockback. */
const COUNTER_REACH = 70;
const COUNTER_STUN = 0.7;
const COUNTER_KNOCKBACK = 300;

export interface EffectContext {
  /** Random multiplier for damage rolls, in [0.9, 1.1]. Injected so effects stay deterministic. */
  roll: () => number;
  /** Match-wide multiplier on healing (weakens over time in team matches). */
  healMult?: () => number;
  /** Match-wide multiplier on damage taken (rises over time in team matches). */
  defenseMult?: () => number;
  onHeal?: (source: Fighter, target: Fighter, amount: number) => void;
  /** Finds a fighter by uid (a status remembers who applied it). */
  fighters?: (uid: number) => Fighter | undefined;
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
  if (lost > 0) target.passive.calm = 0;
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
        // The marker's team hits a marked target harder; Focused Assault adds a little more.
        const mark = target.statuses.find((s) => s.type === 'marked' && s.team === source.team);
        const markMult = mark ? mark.value * (source.hasStatus('focused') ? 1.08 : 1) : 1;
        const rawDamage = e.amount * source.damageMult * markMult * ctx.roll() * (ctx.defenseMult?.() ?? 1);
        const taken = target.statusMult('guard') * (target.form?.damageTaken ?? 1) * passiveDamageTaken(target);
        const dealt = takeDamage(target, Math.round(rawDamage * taken), e.pierce);
        if (dealt > 0) {
          source.stats.damageDealt += dealt;
          source.stats.hits += 1;
          target.stats.damageTaken += dealt;
          gainEnergy(source, dealt * ENERGY_ON_DEAL);
          gainEnergy(target, dealt * ENERGY_ON_TAKE);
          gainUlt(source, dealt * ULT_ON_DEAL);
          gainUlt(target, dealt * ULT_ON_TAKE);
          awakenGain(source, 'dealt', dealt);
          // Damage a guard or resistance shrugged off feeds the meter too.
          awakenGain(target, 'taken', dealt + rawDamage * (1 - taken));
        }
        ctx.onHit(source, target, dealt, skill);
        if (dealt > 0) applyMarks(ctx, source, target, skill);
        if (dealt > 0 && !self) counterStrike(ctx, source, target, skill);
        if (dealt > 0 && !self && ctx.fighters) {
          // A commander earns morale when their orders pay off: a buffed ally hitting, a marked enemy hit, a guard soaking damage.
          const buff = source.statuses.find((s) => s.type === 'damageBuff' && s.source !== source.uid);
          const buffer = buff ? ctx.fighters(buff.source) : undefined;
          if (buffer) awakenGain(buffer, 'support', dealt * 0.5);
          const marker = mark && mark.source !== source.uid ? ctx.fighters(mark.source) : undefined;
          if (marker) awakenGain(marker, 'support', dealt * 0.5);
          const guard = target.statuses.find((s) => s.type === 'guard' && s.source !== target.uid);
          const guarder = guard ? ctx.fighters(guard.source) : undefined;
          if (guarder) awakenGain(guarder, 'support', rawDamage * (1 - taken) * 0.8);
        }
        break;
      }
      case 'knockback': {
        const dir = norm(sub(target.pos, origin));
        target.knock = scale(dir, e.force * KNOCKBACK_TAKEN_MULT * (target.form?.knockbackTaken ?? 1) * passiveKnockbackTaken(target) * target.statusMult('steady'));
        break;
      }
      case 'stun':
        if (!self && target.hasStatus('ward')) break;
        // A move that can't be interrupted (a domain being opened) shrugs stuns off while it winds up.
        if (target.casting?.skill.uninterruptible) break;
        {
          const steady = target.statusMult('steady');
          if (steady <= 0.3) break;
          if (steady < 1) {
            addStatus(target, 'stun', e.duration * steady, 0, source.uid);
            break;
          }
        }
        addStatus(target, 'stun', e.duration, 0, source.uid);
        if (!self) awakenInterrupt(source);
        // A stun interrupts wind-ups and channels.
        target.casting = null;
        target.channel = null;
        target.swing = null;
        break;
      case 'burn':
        if (!self && target.hasStatus('ward')) break;
        addStatus(target, 'burn', e.duration, e.dps, source.uid);
        break;
      case 'slow': {
        if (!self && target.hasStatus('ward')) break;
        // A slow resist removes a share of the slow's strength.
        const resist = Math.max(0, ...target.statuses.filter((s) => s.type === 'slowResist').map((s) => s.value));
        addStatus(target, 'slow', e.duration, 1 - (1 - e.factor) * (1 - resist), source.uid);
        break;
      }
      case 'shield':
        addStatus(target, 'shield', e.duration, e.amount, source.uid);
        awakenGain(source, 'support', e.amount * 0.5);
        break;
      case 'heal': {
        const before = target.hp;
        const selfMult = source === target ? (e.selfFactor ?? 1) : 1;
        target.hp = Math.min(target.maxHp, target.hp + Math.round(e.amount * selfMult * (source.form?.healMult ?? 1) * (ctx.healMult?.() ?? 1)));
        const rb = source.passiveDef.kind === 'awakening' ? source.passiveDef.radiusBonus : undefined;
        if (rb && source !== target && before < target.maxHp * 0.35 && target.hp > before) source.passive.boost = rb.expire;
        if (target.hp > before) {
          source.stats.healingDone += target.hp - before;
          awakenGain(source, 'support', target.hp - before);
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
      case 'cleanse': {
        const kept = target.statuses.filter((s) => s.type !== 'stun' && s.type !== 'burn' && s.type !== 'slow');
        if (kept.length < target.statuses.length) awakenGain(source, 'support', 20);
        target.statuses = kept;
        break;
      }
      case 'regen':
        addStatus(target, 'regen', e.duration, e.hps, source.uid);
        break;
      case 'ward':
        addStatus(target, 'ward', e.duration, 1, source.uid);
        break;
      case 'slowResist':
        addStatus(target, 'slowResist', e.duration, e.share, source.uid);
        break;
      case 'unslow':
        for (const s of target.statuses) if (s.type === 'slow') s.remaining *= 1 - e.cut;
        break;
      case 'mark': {
        addStatus(target, 'marked', e.duration, e.amount, source.uid);
        const m = target.statuses.find((s) => s.type === 'marked' && s.source === source.uid);
        if (m) m.team = source.team;
        break;
      }
      case 'focus':
        addStatus(target, 'focused', e.duration, 1, source.uid);
        break;
      case 'purge':
        target.statuses = target.statuses.filter((s) => !['shield', 'guard', 'damageBuff', 'speedBuff', 'steady', 'ward', 'regen', 'counter'].includes(s.type));
        break;
      case 'expose':
        addStatus(target, 'exposed', e.duration, 1, source.uid);
        break;
      case 'steady':
        addStatus(target, 'steady', e.duration, e.factor, source.uid);
        break;
      case 'counter':
        addStatus(target, 'counter', e.duration, e.damage, source.uid);
        break;
      case 'speedBuff':
        addStatus(target, 'speedBuff', e.duration, e.factor, source.uid);
        break;
      case 'damageBuff':
        addStatus(target, 'damageBuff', e.duration, e.factor, source.uid);
        break;
    }
  }
  // Assisting a teammate can give the helper a short burst of speed (Erwin's awakened passive).
  if (!self) {
    const ap = source.passiveDef;
    if (ap.kind === 'awakening' && ap.assistSpeed && effects.some((x) => x.type === 'guard' || x.type === 'damageBuff' || x.type === 'speedBuff' || x.type === 'steady')) {
      addStatus(source, 'speedBuff', ap.assistSpeed.duration, ap.assistSpeed.factor, source.uid);
    }
  }
}

/** A braced target answers the first close-range hit that lands: damage, a stun and knockback, once per use. */
function counterStrike(ctx: EffectContext, attacker: Fighter, braced: Fighter, skill: SkillDef): void {
  const status = braced.statuses.find((s) => s.type === 'counter');
  if (!status || !attacker.alive || !braced.alive) return;
  if (skill.kind === 'projectile' || skill.kind === 'beam' || skill.kind === 'zone') return;
  const gap = Math.hypot(attacker.pos.x - braced.pos.x, attacker.pos.y - braced.pos.y) - attacker.def.radius - braced.def.radius;
  if (gap > COUNTER_REACH) return;
  braced.statuses = braced.statuses.filter((s) => s !== status);
  const dealt = takeDamage(attacker, Math.round(status.value * braced.damageMult));
  braced.stats.damageDealt += dealt;
  attacker.stats.damageTaken += dealt;
  const steady = attacker.statusMult('steady');
  attacker.knock = scale(norm(sub(attacker.pos, braced.pos)), COUNTER_KNOCKBACK * steady * passiveKnockbackTaken(attacker));
  if (steady > 0.3 && !attacker.casting?.skill.uninterruptible) {
    addStatus(attacker, 'stun', COUNTER_STUN * steady, 0, braced.uid);
    attacker.casting = null;
    attacker.channel = null;
    attacker.swing = null;
  }
  ctx.onHit(braced, attacker, dealt, BRACE_COUNTER);
}

/** Total direct damage a skill deals per application, ignoring multipliers. */
export function baseDamage(skill: SkillDef): number {
  return skill.effects.reduce((sum, e) => sum + (e.type === 'damage' ? e.amount : 0), 0);
}
