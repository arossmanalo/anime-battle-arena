import { baseDamage } from '../effects';
import { mainRole, roleScores } from '../roles';
import { supportTargets } from '../skills/fire';
import type { Fighter } from '../Fighter';
import type { Simulation } from '../Simulation';
import type { AiProfile, Difficulty, SkillDef, SkillSlot, Vec } from '../types';
import { add, dist, distToSegment, norm, perp, scale, sub } from '../vec';

interface DifficultyParams {
  /** Seconds between decisions — lower reacts faster. */
  think: number;
  /** ± fraction of random noise on skill scores. */
  noise: number;
  /** Chance to notice and dodge an incoming attack on a given decision. */
  dodge: number;
}

const DIFFICULTY: Record<Difficulty, DifficultyParams> = {
  easy: { think: 0.45, noise: 0.5, dodge: 0.25 },
  normal: { think: 0.25, noise: 0.25, dodge: 0.55 },
  hard: { think: 0.12, noise: 0.1, dodge: 0.85 },
};

/** Preferred distance to the target, on top of both fighters' radii. */
const PREFERRED_RANGE: Record<AiProfile, number> = {
  rushdown: 30,
  balanced: 140,
  zoner: 240,
};

const RANGE_SLACK = 40;
/** A melee fighter closing in stops at this fraction of its reach, with a tighter slack so it stays in range. */
const MELEE_CLOSE = 0.4;
const MELEE_SLACK = 25;
/** Horizontal share of movement needed before a running fighter turns to face it. */
const TURN_THRESHOLD = 0.35;
/** Minimum seconds between turns while running, so quick direction changes don't flicker the sprite. */
const TURN_DELAY = 0.15;
const WALL_MARGIN = 50;
const DANGER_RADIUS = 180;
/** Skills scoring below this are held back. */
const MIN_SCORE = 6;

type MoveMode = 'approach' | 'retreat' | 'strafe' | 'dodge' | 'follow';

/**
 * Utility AI: moves every tick, re-decides every `think` seconds. Movement is always AI-driven;
 * skills are only chosen when the Simulation allows it (AI fighters, or a player on Auto / idle).
 */
export class UtilityAI {
  mode: MoveMode = 'approach';
  private thinkTimer = 0;
  private turnLock = 0;
  private strafeDir: 1 | -1 = 1;
  private dodgeDir: Vec = { x: 0, y: 0 };
  /** Where a support wants to stand (behind the front line). */
  private followPoint: Vec = { x: 0, y: 0 };
  private readonly params: DifficultyParams;

  constructor(
    private readonly f: Fighter,
    private readonly sim: Simulation,
    difficulty: Difficulty,
  ) {
    this.params = DIFFICULTY[difficulty];
    this.strafeDir = sim.rng.chance(0.5) ? 1 : -1;
  }

  update(dt: number, allowSkills: boolean): void {
    const target = this.sim.nearestEnemy(this.f);
    if (!target) {
      this.f.vel = { x: 0, y: 0 };
      return;
    }

    this.thinkTimer -= dt;
    this.turnLock -= dt;
    if (this.thinkTimer <= 0) {
      this.thinkTimer = this.params.think;
      this.pickFocus();
      this.decideMove(this.sim.nearestEnemy(this.f) ?? target);
      if (allowSkills && !this.f.stunned) {
        if (this.f.canTransform) this.sim.tryTransform(this.f);
        else if (!this.f.busy) {
          const slot = this.chooseSkill(target);
          if (slot !== null) this.sim.tryCast(this.f, slot);
        }
      }
    }
    this.steer(target);
    // The default attack is automatic: swing whenever something is in reach.
    this.sim.tryAttack(this.f);
  }

  /**
   * Chooses which enemy to concentrate on when there are several: weak, close, and valuable (supports)
   * targets score high, tanks low. Sticks with the current focus unless something clearly better appears.
   * A taunt overrides this (see Simulation.nearestEnemy). With one enemy there is nothing to choose.
   */
  private pickFocus(): void {
    const f = this.f;
    const enemies = this.sim.enemiesOf(f);
    const orders = this.sim.ordersOf(f.team);
    // A focus order beats everything except a taunt (handled in Simulation.nearestEnemy).
    const ordered = orders.focus === null ? undefined : enemies.find((e) => e.uid === orders.focus);
    if (ordered) {
      f.focus = ordered;
      return;
    }
    const protectedAlly = orders.protect === null ? undefined : this.sim.alliesOf(f, false).find((a) => a.uid === orders.protect);
    if (enemies.length < 2) {
      f.focus = enemies[0] ?? null;
      return;
    }
    let best: Fighter | null = null;
    let bestScore = -Infinity;
    for (const e of enemies) {
      const r = roleScores(e.def);
      let score =
        -dist(f.pos, e.pos) * 0.12 +
        (1 - e.hp / e.maxHp) * 30 +
        r.support * 22 +
        r.damage * 5 -
        r.tank * 8;
      if (e.stunned) score += 6;
      if (f.focus === e) score += 12;
      // Protecting someone: go after whoever is attacking them.
      if (protectedAlly && e.focus === protectedAlly) score += 26;
      score += this.sim.rng.range(-1, 1) * this.params.noise * 8;
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    f.focus = best;
  }

  /** Supports hang back: stand just behind the allies, away from the enemy. */
  private wantsBackline(): boolean {
    const role = mainRole(this.f.def);
    return role === 'support' && this.sim.alliesOf(this.f, false).length > 0;
  }

  private decideMove(target: Fighter): void {
    const threat = this.incomingThreat();
    if (threat && this.sim.rng.chance(this.params.dodge)) {
      this.mode = 'dodge';
      // Step sideways out of the attack's path, away from the nearer wall.
      let d = perp(threat);
      const probe = add(this.f.pos, scale(d, 60));
      if (this.nearWall(probe)) d = scale(d, -1);
      this.dodgeDir = d;
      return;
    }

    const gap = dist(this.f.pos, target.pos) - this.f.def.radius - target.def.radius;
    const orders = this.sim.ordersOf(this.f.team);
    const role = mainRole(this.f.def);
    // A tank told to protect someone stands between them and the enemy.
    const guarded = orders.protect === null ? undefined : this.sim.alliesOf(this.f, false).find((a) => a.uid === orders.protect);
    if (role === 'tank' && guarded) {
      this.followPoint = add(guarded.pos, scale(norm(sub(target.pos, guarded.pos)), 55));
      this.mode = dist(this.f.pos, this.followPoint) > 50 ? 'follow' : 'strafe';
      return;
    }
    // Defensive stance: non-support fighters hold near their team until an enemy comes close.
    if (orders.stance === 'defensive' && role !== 'support' && gap > 240) {
      const mates = this.sim.alliesOf(this.f, false);
      if (mates.length) {
        const cx = mates.reduce((s, a) => s + a.pos.x, 0) / mates.length;
        const cy = mates.reduce((s, a) => s + a.pos.y, 0) / mates.length;
        this.followPoint = add({ x: cx, y: cy }, scale(norm(sub(target.pos, { x: cx, y: cy })), 40));
        this.mode = dist(this.f.pos, this.followPoint) > 50 ? 'follow' : 'strafe';
        return;
      }
    }
    if (this.wantsBackline()) {
      const mates = this.sim.alliesOf(this.f, false);
      const cx = mates.reduce((s, a) => s + a.pos.x, 0) / mates.length;
      const cy = mates.reduce((s, a) => s + a.pos.y, 0) / mates.length;
      const away = norm(sub({ x: cx, y: cy }, target.pos));
      this.followPoint = add({ x: cx, y: cy }, scale(away, 70));
      if (dist(this.f.pos, this.followPoint) > 60) this.mode = 'follow';
      else this.mode = gap < 140 ? 'retreat' : 'strafe';
      if (this.sim.rng.chance(0.15) || this.nearWall(this.f.pos)) this.strafeDir = this.strafeDir === 1 ? -1 : 1;
      return;
    }
    const melee = this.wantsMelee(gap);
    let preferred = melee ? this.f.def.attack.range * MELEE_CLOSE : PREFERRED_RANGE[this.f.def.aiProfile];
    if (orders.stance === 'aggressive') preferred = Math.min(preferred, 90);
    const slack = melee ? MELEE_SLACK : RANGE_SLACK;
    if (gap > preferred + slack) this.mode = 'approach';
    else if (gap < preferred - slack && !melee && this.f.def.aiProfile !== 'rushdown' && orders.stance !== 'aggressive') this.mode = 'retreat';
    else this.mode = 'strafe';

    if (this.sim.rng.chance(0.15) || this.nearWall(this.f.pos)) this.strafeDir = this.strafeDir === 1 ? -1 : 1;
  }

  /**
   * Whether to fight at punching range. Rushdown fighters always do; all-rounders do when an enemy is already
   * close, or when none of their damaging skills is ready (so they trade blows while waiting); zoners and ranged attackers never do.
   */
  private wantsMelee(gap: number): boolean {
    const { attack, aiProfile } = this.f.def;
    if (attack.style !== 'melee' || aiProfile === 'zoner') return false;
    if (aiProfile === 'rushdown' || gap <= attack.range * 2) return true;
    return !([0, 1, 2, 3, 4] as SkillSlot[]).some((slot) => {
      const skill = this.f.skill(slot);
      return skill.kind !== 'buff' && this.f.cooldown(skill) <= 0 && this.f.canAfford(skill);
    });
  }

  private steer(target: Fighter): void {
    const toTarget = norm(sub(target.pos, this.f.pos));
    let dir: Vec;
    switch (this.mode) {
      case 'approach':
        dir = add(toTarget, scale(perp(toTarget), 0.3 * this.strafeDir));
        break;
      case 'retreat':
        dir = add(scale(toTarget, -1), scale(perp(toTarget), 0.6 * this.strafeDir));
        break;
      case 'strafe':
        dir = scale(perp(toTarget), this.strafeDir);
        break;
      case 'dodge':
        dir = this.dodgeDir;
        break;
      case 'follow':
        dir = norm(sub(this.followPoint, this.f.pos));
        break;
    }
    dir = norm(add(norm(dir), this.wallRepulsion()));
    this.f.vel = scale(dir, this.f.speed);
    // Busy (winding up, channelling, dashing): face the enemy. Otherwise face where we're running, so
    // kiting or retreating doesn't play the run cycle backwards. Mostly-vertical moves keep the current facing.
    if (this.f.busy) {
      if (Math.abs(toTarget.x) > 0.1) this.f.facing = toTarget.x > 0 ? 1 : -1;
    } else if (Math.abs(dir.x) > TURN_THRESHOLD && this.turnLock <= 0) {
      const facing = dir.x > 0 ? 1 : -1;
      if (facing !== this.f.facing) {
        this.f.facing = facing;
        this.turnLock = TURN_DELAY;
      }
    }
  }

  /** Direction of the most dangerous incoming projectile or beam, if any. */
  private incomingThreat(): Vec | null {
    const me = this.f;
    for (const p of this.sim.projectiles) {
      if (p.owner.team === me.team) continue;
      const toMe = sub(me.pos, p.pos);
      if (Math.hypot(toMe.x, toMe.y) > DANGER_RADIUS) continue;
      const heading = norm(p.vel);
      const ahead = add(p.pos, scale(heading, DANGER_RADIUS));
      if (distToSegment(me.pos, p.pos, ahead) < me.def.radius + p.radius + 12) return heading;
    }
    for (const b of this.sim.beams) {
      if (b.owner.team === me.team) continue;
      const end = add(b.owner.pos, scale(b.dir, b.length));
      if (distToSegment(me.pos, b.owner.pos, end) < b.halfWidth + me.def.radius + 20) return b.dir;
    }
    for (const e of this.sim.enemiesOf(me)) {
      // A wind-up aimed at us is a threat too.
      if (e.casting && dist(e.pos, me.pos) < e.casting.skill.range) return norm(sub(me.pos, e.pos));
    }
    return null;
  }

  private chooseSkill(target: Fighter): SkillSlot | null {
    const d = dist(this.f.pos, target.pos);
    let best: SkillSlot | null = null;
    let bestScore = MIN_SCORE;
    const holdUlts = this.sim.ordersOf(this.f.team).holdUlts;
    for (const slot of [0, 1, 2, 3, 4] as SkillSlot[]) {
      const skill = this.f.skill(slot);
      if (this.f.cooldown(skill) > 0 || !this.f.canAfford(skill)) continue;
      if (holdUlts && skill.ultimate) continue; // the player will call it
      const score = this.score(skill, target, d) * (1 + this.sim.rng.range(-1, 1) * this.params.noise);
      if (score > bestScore) {
        bestScore = score;
        best = slot;
      }
    }
    return best;
  }

  /** How badly teammates need a support skill, as a skill score (0 = don't cast). */
  private supportScore(skill: SkillDef): number {
    const targets = supportTargets(this.sim, this.f, skill);
    if (!targets.length) return 0;
    const sup = skill.support!;
    const hurt = Math.max(...targets.map((a) => 1 - a.hp / a.maxHp));
    const pressured = targets.some((a) => this.sim.enemiesOf(a).some((e) => dist(a.pos, e.pos) < 380));
    let best = 0;
    for (const e of sup.effects) {
      let s = 0;
      if (e.type === 'heal') s = hurt >= 0.2 ? 8 + hurt * 48 : 0;
      else if (e.type === 'cleanse') s = targets.some((a) => a.stunned || a.hasStatus('burn') || a.hasStatus('slow')) ? 32 : 0;
      else if (e.type === 'shield' || e.type === 'guard') {
        const have = targets.every((a) => a.hasStatus(e.type === 'shield' ? 'shield' : 'guard'));
        s = pressured && !have ? 16 + hurt * 14 : 0;
      } else if (e.type === 'damageBuff' || e.type === 'speedBuff') {
        const have = targets.every((a) => a.hasStatus(e.type));
        s = pressured && !have ? 15 : 0;
      }
      best = Math.max(best, s);
    }
    return best;
  }

  /** A taunt is worth casting when enemies are in reach and are going for someone else. */
  private tauntScore(skill: SkillDef, d: number): number {
    const me = this.f;
    const reach = (skill.radius ?? skill.range) + 30;
    const hits = this.sim.enemiesOf(me).filter((e) => dist(me.pos, e.pos) <= reach && e.tauntedBy !== me.uid);
    if (!hits.length) return 0;
    const onAllies = hits.filter((e) => e.focus && e.focus !== me && e.focus.team === me.team).length;
    const alliesHurt = this.sim.alliesOf(me, false).some((a) => a.hp < a.maxHp * 0.85);
    void d;
    return onAllies > 0 ? 14 + onAllies * 8 + (alliesHurt ? 8 : 0) : 0;
  }

  private score(skill: SkillDef, target: Fighter, d: number): number {
    if (skill.support) return this.supportScore(skill) + (skill.selfEffects ? 0 : 0);
    if (skill.effects.some((e) => e.type === 'taunt')) return this.tauntScore(skill, d);
    if (skill.kind === 'buff') {
      const buffs = (skill.selfEffects ?? []).map((e) => e.type);
      const active = this.f.statuses.some((s) => (buffs as string[]).includes(s.type));
      if (active) return 0;
      return 14 + (this.f.hp < this.f.maxHp * 0.5 ? 10 : 0) + (d < 200 ? 4 : 0);
    }

    let expected = baseDamage(skill) * (skill.count ?? 1);
    if ((skill.kind === 'beam' || skill.kind === 'zone') && skill.duration && skill.tickInterval) {
      // Assume a moving target only eats about half the ticks.
      expected *= (skill.duration / skill.tickInterval) * 0.5;
    }
    expected += baseDamage({ ...skill, effects: skill.finale ?? [] });
    if (skill.effects.some((e) => e.type === 'stun')) expected += 6;

    const reach = skill.range + target.def.radius;
    const rangeFit = d <= reach ? 1 : d <= reach * 1.4 ? 0.35 : 0.05;
    const stunnedBonus = target.stunned ? 1.4 : 1;
    const ultBonus = skill.ultimate ? 1.3 : 1;
    // Mild preference for cheaper skills so energy stays available.
    const costPenalty = 1 / (1 + skill.energyCost / 80);
    return expected * rangeFit * stunnedBonus * ultBonus * costPenalty;
  }

  private nearWall(p: Vec): boolean {
    const { width, height } = this.sim.arena;
    return p.x < WALL_MARGIN || p.y < WALL_MARGIN || p.x > width - WALL_MARGIN || p.y > height - WALL_MARGIN;
  }

  private wallRepulsion(): Vec {
    const { width, height } = this.sim.arena;
    const p = this.f.pos;
    const push = (dist: number) => (dist < WALL_MARGIN ? (1 - dist / WALL_MARGIN) * 1.5 : 0);
    return {
      x: push(p.x) - push(width - p.x),
      y: push(p.y) - push(height - p.y),
    };
  }
}
