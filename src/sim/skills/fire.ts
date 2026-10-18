import type { Fighter } from '../Fighter';
import type { Simulation } from '../Simulation';
import type { SkillDef, Vec } from '../types';
import { add, dist, norm, rotate, scale, sub } from '../vec';

/** How much of the target's velocity projectiles lead by (0 = aim at current position). */
const PROJECTILE_LEAD = 0.5;

function aimDir(f: Fighter, target: Fighter | undefined, speed?: number): Vec {
  if (!target) return { x: f.facing, y: 0 };
  let aimAt = target.pos;
  if (speed) {
    const t = (dist(f.pos, target.pos) / speed) * PROJECTILE_LEAD;
    aimAt = add(target.pos, scale(target.vel, t));
  }
  return norm(sub(aimAt, f.pos));
}

/** The teammates a support skill reaches. */
export function supportTargets(sim: Simulation, f: Fighter, skill: SkillDef): Fighter[] {
  const sup = skill.support;
  if (!sup) return [];
  const range = sup.range ?? 400;
  const allies = sim.alliesOf(f).filter((a) => dist(a.pos, f.pos) <= range);
  if (sup.to === 'allAllies') return allies;
  const others = allies.filter((a) => a !== f);
  if (sup.to === 'nearestAlly') {
    return others.length ? [others.reduce((b, a) => (dist(a.pos, f.pos) < dist(b.pos, f.pos) ? a : b))] : [f];
  }
  // The protected ally comes first when it is hurt at all.
  const protect = sim.ordersOf(f.team).protect;
  const guarded = protect === null ? undefined : allies.find((a) => a.uid === protect);
  if (guarded && guarded.hp < guarded.maxHp * 0.98) return [guarded];
  // lowestAlly: the one with the lowest HP fraction (the caster included).
  return allies.length ? [allies.reduce((b, a) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b))] : [];
}

function applySupport(sim: Simulation, f: Fighter, skill: SkillDef): void {
  for (const ally of supportTargets(sim, f, skill)) {
    sim.applyEffects(f, ally, skill.support!.initial ? [...skill.support!.effects, ...skill.support!.initial] : skill.support!.effects, skill, f.pos);
    // Area skills already show their own burst; only buffs need a mark on each teammate.
    if (skill.kind === 'buff') {
      // `uid` and `duration` let the view put the skill's lasting aura art on the teammate for as long as the effect lasts.
      const duration = Math.max(1.5, ...skill.support!.effects.map((e) => ('duration' in e ? e.duration : 0)));
      sim.emit({ type: 'impact', x: ally.pos.x, y: ally.pos.y, radius: 34, color: skill.color, skillId: skill.id, support: true, uid: ally.uid, duration });
    }
  }
}

/** Runs a skill once its wind-up is done. Energy and cooldown were already paid when the cast started. */
export function fireSkill(sim: Simulation, f: Fighter, skill: SkillDef): void {
  const target = sim.nearestEnemy(f);
  if (skill.selfEffects) sim.applyEffects(f, f, skill.selfEffects, skill, f.pos);
  if (skill.support) applySupport(sim, f, skill);
  // Tactical Advantage: a stored charge empowers the next ability that has an `empower` set.
  if (skill.empower && f.passive.charges > 0) {
    f.passive.charges--;
    const targets = skill.support ? supportTargets(sim, f, skill) : [f];
    for (const t of targets) sim.applyEffects(f, t, skill.empower, skill, f.pos);
  }

  switch (skill.kind) {
    case 'projectile': {
      const speed = skill.speed ?? 450;
      const dir = aimDir(f, target, speed);
      const count = skill.count ?? 1;
      const spread = skill.spread ?? 0;
      for (let i = 0; i < count; i++) {
        const angle = count > 1 ? (i - (count - 1) / 2) * spread : 0;
        const d = rotate(dir, angle);
        sim.spawnProjectile(f, skill, add(f.pos, scale(d, f.def.radius + 4)), scale(d, speed));
      }
      break;
    }
    case 'beam': {
      const beam = sim.spawnBeam(f, skill, aimDir(f, target));
      f.channel = { beamId: beam.id, remaining: beam.remaining };
      break;
    }
    case 'dash': {
      const speed = skill.speed ?? 900;
      f.dash = { skill, dir: aimDir(f, target), remaining: skill.range / speed, hit: new Set() };
      break;
    }
    case 'aoe': {
      const center = skill.atTarget && target ? { ...target.pos } : { ...f.pos };
      sim.burst(f, skill, center, skill.radius ?? 80);
      break;
    }
    case 'zone': {
      const center = skill.atTarget && target ? { ...target.pos } : { ...f.pos };
      sim.spawnZone(f, skill, center);
      break;
    }
    case 'buff':
      break;
  }

  if (target) f.facing = target.pos.x >= f.pos.x ? 1 : -1;
  sim.emit({ type: 'skillFired', uid: f.uid, skill, x: f.pos.x, y: f.pos.y });
}
