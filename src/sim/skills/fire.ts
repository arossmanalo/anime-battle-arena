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

/** Runs a skill once its wind-up is done. Energy and cooldown were already paid when the cast started. */
export function fireSkill(sim: Simulation, f: Fighter, skill: SkillDef): void {
  const target = sim.nearestEnemy(f);
  if (skill.selfEffects) sim.applyEffects(f, f, skill.selfEffects, skill, f.pos);

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
