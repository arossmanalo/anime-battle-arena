import { ROSTER } from '../data/fighters';
import { roleScores } from '../sim/roles';
import type { Effect, FighterDef, Role, SkillDef } from '../sim/types';

export const hexColor = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

export const ROLE_META: Record<Role, { label: string; color: string; blurb: string }> = {
  tank: { label: 'Tank', color: '#1f4fd8', blurb: 'Soaks damage, draws enemies and holds the front line.' },
  damage: { label: 'Damage', color: '#d6202f', blurb: 'Kills things quickly. Fragile if left unprotected.' },
  support: { label: 'Support', color: '#0a8a60', blurb: 'Heals, shields and buffs the team, or controls the enemy.' },
};

export function mainRoleOf(def: FighterDef): Role {
  const s = roleScores(def);
  return (['tank', 'support', 'damage'] as Role[]).reduce((best, k) => (s[k] > s[best] ? k : best), 'damage' as Role);
}

export const fighterIds = ROSTER.map((f) => f.id);

const pct = (f: number): string => `${Math.round(Math.abs(1 - f) * 100)}%`;

/** One effect in plain words. */
export function describeEffect(e: Effect): string {
  switch (e.type) {
    case 'damage':
      return `${Math.round(e.amount * 10) / 10} damage${e.pierce ? ' (pierces shields)' : ''}`;
    case 'knockback':
      return `knocks back (${e.force})`;
    case 'stun':
      return `stuns ${e.duration}s`;
    case 'burn':
      return `burns ${e.dps}/s for ${e.duration}s`;
    case 'slow':
      return `slows ${pct(e.factor)} for ${e.duration}s`;
    case 'shield':
      return `${e.amount} shield (${e.duration}s)${e.reflect ? `, reflects ${Math.round(e.reflect * 100)}% of what it absorbs (max ${e.cap ?? '-'} per hit)` : ''}${e.curse ? ', burns the attacker' : ''}${e.charge ? ', stores Retaliation' : ''}`;
    case 'heal':
      return `heals ${e.amount}`;
    case 'speedBuff':
      return `+${pct(e.factor)} speed (${e.duration}s)`;
    case 'damageBuff':
      return `+${pct(e.factor)} damage (${e.duration}s)`;
    case 'taunt':
      return `taunts enemies ${e.duration}s`;
    case 'guard':
      return `${pct(e.factor)} less damage taken (${e.duration}s)`;
    case 'cleanse':
      return 'cleanses stun, burn and slow';
    case 'steady':
      return `harder to shove or stun (${e.duration}s)`;
    case 'counter':
      return `braces and counters the next close hit (${e.damage})`;
    case 'regen':
      return `heals ${e.hps}/s for ${e.duration}s`;
    case 'ward':
      return `ignores slow, burn and stun (${e.duration}s)`;
    case 'purge':
      return 'strips buffs and shields';
    case 'expose':
      return `no dodging or blocking (${e.duration}s)`;
    case 'slowResist':
      return `${Math.round(e.share * 100)}% slow resist (${e.duration}s)`;
    case 'unslow':
      return `cuts slows ${Math.round(e.cut * 100)}%`;
    case 'mark':
      return `marks: +${pct(e.amount)} damage taken (${e.duration}s)`;
    case 'focus':
      return `bonus damage to marked enemies (${e.duration}s)`;
    case 'cage':
      return `cages the target for ${e.duration}s (${e.hp} durability): it cannot walk and takes ${Math.round(e.reflect * 100)}% of its own hits back${e.curse ? ' and burns' : ''}`;
    case 'stance':
      return `${e.duration}s stance: stores blocked damage, then releases a shockwave (up to ${e.release.cap} damage, radius ${e.release.radius}${e.release.burn ? ', burns' : ''})`;
    case 'geass':
      return `stops the target ${e.duration}s (once per enemy)`;
    case 'rescue':
      return `under ${Math.round(e.threshold * 100)}% HP: extra heal ${e.heal} and a speed burst`;
    default:
      return '';
  }
}

const KIND_LABEL: Record<SkillDef['kind'], string> = {
  projectile: 'Projectile',
  beam: 'Beam',
  dash: 'Dash',
  aoe: 'Area burst',
  zone: 'Zone',
  buff: 'Buff',
};

export interface SkillInfo {
  skill: SkillDef;
  kindLabel: string;
  lines: string[];
  allies: string[];
  tags: string[];
}

export function describeSkill(skill: SkillDef): SkillInfo {
  const tags: string[] = [];
  if (skill.ultimate) tags.push('Ultimate');
  if (skill.domain) tags.push('Domain');
  if (skill.uninterruptible) tags.push('Uninterruptible');
  if (skill.bounces) tags.push(`Ricochets x${skill.bounces}`);
  if (skill.pull) tags.push('Pulls enemies in');
  if (skill.requiresHpBelow) tags.push(`Only below ${Math.round(skill.requiresHpBelow * 100)}% HP`);
  if (skill.empower?.length) tags.push('Empowered by Tactical Advantage');
  const lines = skill.effects.map(describeEffect).filter(Boolean);
  const allies = [...(skill.selfEffects ?? []), ...(skill.support?.initial ?? []), ...(skill.support?.effects ?? [])].map(describeEffect).filter(Boolean);
  if (skill.finale?.length) lines.push(`final blast: ${skill.finale.map(describeEffect).filter(Boolean).join(', ')}`);
  if (skill.outer) lines.push(`outer ring: ${skill.outer.effects.map(describeEffect).join(', ')}`);
  return { skill, kindLabel: KIND_LABEL[skill.kind], lines, allies, tags };
}

export function skillMeta(skill: SkillDef): string {
  const bits: string[] = [];
  if (!skill.ultimate) bits.push(`${skill.energyCost} energy`);
  bits.push(`${skill.cooldown}s cooldown`);
  if (skill.castTime >= 0.3) bits.push(`${skill.castTime}s cast`);
  if (skill.range < 9000 && skill.range > 0) bits.push(`range ${skill.range}`);
  if (skill.radius && skill.radius < 1000) bits.push(`radius ${skill.radius}`);
  return bits.join(', ');
}

/** Fighter stat bars on a 0-100 scale, relative to the roster. */
export function statBars(def: FighterDef): { label: string; value: number; text: string }[] {
  const max = (f: (d: FighterDef) => number) => Math.max(...ROSTER.map(f));
  const burst = (d: FighterDef) => Math.max(...[...d.skills, d.ultimate].map((s) => s.effects.reduce((n, e) => n + (e.type === 'damage' ? e.amount : 0), 0)));
  const sup = (d: FighterDef) => roleScores(d).support;
  return [
    { label: 'Health', value: (def.hp / max((d) => d.hp)) * 100, text: String(def.hp) },
    { label: 'Speed', value: (def.speed / max((d) => d.speed)) * 100, text: String(def.speed) },
    { label: 'Burst', value: (burst(def) / Math.max(1, max(burst))) * 100, text: String(Math.round(burst(def))) },
    { label: 'Support', value: sup(def) * 100, text: `${Math.round(sup(def) * 100)}%` },
    { label: 'Energy', value: (def.energyRegen / max((d) => d.energyRegen)) * 100, text: `${def.energyRegen}/s` },
  ];
}

export const AI_LABEL: Record<FighterDef['aiProfile'], string> = {
  rushdown: 'Rushdown',
  balanced: 'All-rounder',
  zoner: 'Zoner',
};
