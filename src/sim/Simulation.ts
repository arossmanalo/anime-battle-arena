import { UtilityAI } from './ai/UtilityAI';
import { attackSkill, COMBO_WINDOW, FINISHER_MULT, isFinisher, REACH_LEEWAY } from './attacks';
import { tickPassive } from './passives';
import { applyEffects as applyEffectsTo, gainUlt, takeDamage, ULT_REGEN, type EffectContext } from './effects';
import type { Beam, Projectile, Zone } from './entities';
import { Fighter } from './Fighter';
import { Rng } from './rng';
import { fireSkill } from './skills/fire';
import type {
  CastFailReason,
  Command,
  Difficulty,
  Effect,
  SimConfig,
  SimEvent,
  SkillDef,
  SkillSlot,
  Vec,
} from './types';
import { add, dist, distToSegment, norm, scale, sub } from './vec';

/** Fixed timestep: the sim always advances in 1/60 s steps, whatever the frame rate. */
export const DT = 1 / 60;
export const DEFAULT_ARENA = { width: 900, height: 372 };
export const DEFAULT_TIME_LIMIT = 99;

const CAST_MOVE_MULT = 0.35;
const SWING_MOVE_MULT = 0.6;
const KNOCK_DECAY = 8;
const TRANSFORM_INVULN = 1.2;
const LOW_HP_LINE = 0.3;
/** Movement per tick below which a fighter counts as standing still (matches the view's idle threshold). */
const IDLE_MOVE = 0.4;

export class Simulation {
  readonly rng: Rng;
  readonly arena: { width: number; height: number };
  readonly timeLimit: number;
  readonly difficulty: Difficulty;
  readonly idleFallback: number;
  readonly fighters: Fighter[] = [];
  projectiles: Projectile[] = [];
  beams: Beam[] = [];
  zones: Zone[] = [];
  tick = 0;
  over = false;
  /** -1 means a draw. */
  winnerTeam = -1;
  endReason: 'ko' | 'time' | null = null;

  private events: SimEvent[] = [];
  private commands: Command[] = [];
  private nextId = 1;
  private readonly ai = new Map<number, UtilityAI>();
  private readonly lowHpWarned = new Set<number>();
  private readonly koEmitted = new Set<number>();
  private readonly effectCtx: EffectContext;

  constructor(config: SimConfig) {
    this.rng = new Rng(config.seed);
    this.arena = config.arena ?? DEFAULT_ARENA;
    this.timeLimit = config.timeLimit ?? DEFAULT_TIME_LIMIT;
    this.difficulty = config.difficulty ?? 'normal';
    this.idleFallback = config.idleFallback ?? 4;
    this.effectCtx = {
      roll: () => this.rng.range(0.9, 1.1),
      onHit: (source, target, damage, skill) =>
        this.emit({ type: 'hit', source: source.uid, target: target.uid, damage, x: target.pos.x, y: target.pos.y, skill }),
    };

    // Teams start on opposite sides, members spread vertically.
    const teamCount = config.teams.length;
    config.teams.forEach((team, t) => {
      const x = teamCount === 1 ? this.arena.width / 2 : this.arena.width * (0.15 + (0.7 * t) / (teamCount - 1));
      team.forEach((setup, i) => {
        const y = (this.arena.height * (i + 1)) / (team.length + 1);
        const f = new Fighter(this.nextId++, t, setup.def, setup.controller, { x, y });
        f.facing = x < this.arena.width / 2 ? 1 : -1;
        this.fighters.push(f);
        this.ai.set(f.uid, new UtilityAI(f, this, this.difficulty));
      });
    });
    for (const f of this.fighters) this.voice(f, 'intro');
  }

  get time(): number {
    return this.tick * DT;
  }

  get timeLeft(): number {
    return Math.max(0, this.timeLimit - this.time);
  }

  fighter(uid: number): Fighter | undefined {
    return this.fighters.find((f) => f.uid === uid);
  }

  enemiesOf(f: Fighter): Fighter[] {
    return this.fighters.filter((o) => o.team !== f.team && o.alive);
  }

  nearestEnemy(f: Fighter): Fighter | undefined {
    let best: Fighter | undefined;
    let bestD = Infinity;
    for (const o of this.enemiesOf(f)) {
      const d = dist(f.pos, o.pos);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  command(cmd: Command): void {
    this.commands.push(cmd);
  }

  emit(e: SimEvent): void {
    this.events.push(e);
  }

  /** Returns and clears the events produced since the last call. */
  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** Runs headless until the match ends. Returns the number of ticks simulated. */
  runToEnd(maxTicks = Math.ceil((this.timeLimit + 5) / DT)): number {
    while (!this.over && this.tick < maxTicks) {
      this.step();
      this.events.length = 0;
    }
    return this.tick;
  }

  step(): void {
    if (this.over) return;
    this.tick++;

    for (const cmd of this.commands.splice(0)) this.handleCommand(cmd);

    for (const f of this.fighters) {
      if (!f.alive) continue;
      this.updateTimers(f);
    }
    for (const f of this.fighters) {
      if (!f.alive) continue;
      const allowSkills =
        f.auto || (f.controller === 'player' && this.idleFallback > 0 && f.idleTime >= this.idleFallback);
      this.ai.get(f.uid)!.update(DT, allowSkills);
      this.updateCasting(f);
      this.updateSwing(f);
      this.move(f);
    }
    this.separateFighters();
    this.updateProjectiles();
    this.updateBeams();
    this.updateZones();
    this.emitPassiveProcs();
    this.checkDeaths();
    this.checkEnd();
  }

  // ---- commands -------------------------------------------------------------------------------

  private handleCommand(cmd: Command): void {
    const f = this.fighter(cmd.uid);
    if (!f) return;
    switch (cmd.type) {
      case 'castSkill': {
        f.idleTime = 0;
        const reason = this.tryCast(f, cmd.slot);
        if (reason) this.emit({ type: 'castFailed', uid: f.uid, reason });
        break;
      }
      case 'transform':
        f.idleTime = 0;
        if (!this.tryTransform(f)) this.emit({ type: 'castFailed', uid: f.uid, reason: 'unavailable' });
        break;
      case 'setAuto':
        f.auto = cmd.auto;
        break;
    }
  }

  /** Starts casting a skill. Returns null on success, or why it could not be cast. */
  tryCast(f: Fighter, slot: SkillSlot): CastFailReason | null {
    if (!f.alive) return 'dead';
    if (f.stunned) return 'stunned';
    if (f.busy) return 'busy';
    const skill = f.skill(slot);
    if (f.cooldown(skill) > 0) return 'cooldown';
    if (!f.canAfford(skill)) return 'energy';

    f.pay(skill);
    f.swing = null;
    f.cooldowns.set(skill.id, skill.cooldown);
    f.casting = { skill, remaining: skill.castTime };
    f.stats.skillsUsed++;
    this.emit({ type: 'skillCast', uid: f.uid, skill });
    if (skill.ultimate) this.voice(f, 'ultimate');
    return null;
  }

  tryTransform(f: Fighter): boolean {
    if (!f.canTransform || f.stunned) return false;
    const form = f.def.form!;
    f.energy -= form.energyCost;
    f.form = form;
    f.hp = Math.min(f.maxHp, f.hp + Math.round(f.maxHp * form.heal));
    f.invuln = TRANSFORM_INVULN;
    f.casting = null;
    f.swing = null;
    this.emit({ type: 'transform', uid: f.uid, form });
    this.voice(f, 'transform');
    return true;
  }

  // ---- per-fighter update ---------------------------------------------------------------------

  private updateTimers(f: Fighter): void {
    for (const [id, cd] of f.cooldowns) f.cooldowns.set(id, Math.max(0, cd - DT));
    f.energy = Math.min(f.maxEnergy, f.energy + f.energyRegen * DT);
    gainUlt(f, ULT_REGEN * DT);
    f.invuln = Math.max(0, f.invuln - DT);
    f.idleTime += DT;
    f.attackCd = Math.max(0, f.attackCd - DT);
    if (f.comboTimer > 0 && (f.comboTimer -= DT) <= 0) f.combo = 0;
    tickPassive(f, DT);

    for (const s of f.statuses) {
      s.remaining -= DT;
      if (s.type === 'burn') {
        const source = this.fighter(s.source);
        const dealt = takeDamage(f, s.value * DT);
        if (source && dealt > 0) source.stats.damageDealt += dealt;
        f.stats.damageTaken += dealt;
      }
    }
    f.statuses = f.statuses.filter((s) => s.remaining > 0);
  }

  /** Gap between two fighters' edges. */
  private gap(a: Fighter, b: Fighter): number {
    return dist(a.pos, b.pos) - a.def.radius - b.def.radius;
  }

  /** Starts the default attack if an enemy is in reach and the fighter is free. Returns whether it started. */
  tryAttack(f: Fighter): boolean {
    const a = f.def.attack;
    if (!f.alive || f.stunned || f.busy || f.swing || f.attackCd > 0) return false;
    const target = this.nearestEnemy(f);
    if (!target || this.gap(f, target) > a.range) return false;
    const finisher = isFinisher(a, f.combo);
    f.swing = { remaining: a.windup, finisher };
    f.attackCd = a.cooldown * (finisher && a.combo > 1 ? FINISHER_MULT : 1);
    if (Math.abs(target.pos.x - f.pos.x) > 1) f.facing = target.pos.x > f.pos.x ? 1 : -1;
    this.emit({ type: 'attack', uid: f.uid, attack: a, finisher });
    return true;
  }

  private updateSwing(f: Fighter): void {
    if (!f.swing) return;
    if (f.stunned) {
      f.swing = null;
      return;
    }
    f.swing.remaining -= DT;
    if (f.swing.remaining > 0) return;
    const { finisher } = f.swing;
    f.swing = null;
    this.landAttack(f, finisher);
  }

  private landAttack(f: Fighter, finisher: boolean): void {
    const a = f.def.attack;
    const target = this.nearestEnemy(f);
    const skill = attackSkill(f.def, finisher);
    let landed = false;
    if (target && a.style === 'ranged') {
      const dir = norm(sub(target.pos, f.pos));
      this.spawnProjectile(f, skill, add(f.pos, scale(dir, f.def.radius + 4)), scale(dir, a.speed ?? 480));
      landed = true;
    } else if (target && this.gap(f, target) <= a.range + REACH_LEEWAY) {
      this.applyEffects(f, target, skill.effects, skill, f.pos);
      this.emit({ type: 'impact', x: target.pos.x, y: target.pos.y, radius: finisher && a.combo > 1 ? 28 : 18, color: a.color, skillId: skill.id });
      landed = true;
    }
    // A whiff drops the combo.
    f.combo = landed && !finisher ? f.combo + 1 : 0;
    f.comboTimer = landed ? COMBO_WINDOW : 0;
  }

  private updateCasting(f: Fighter): void {
    if (f.casting && !f.stunned) {
      f.casting.remaining -= DT;
      if (f.casting.remaining <= 0) {
        const skill = f.casting.skill;
        f.casting = null;
        fireSkill(this, f, skill);
      }
    }
    if (f.channel) {
      f.channel.remaining -= DT;
      if (f.channel.remaining <= 0) f.channel = null;
    }
  }

  private move(f: Fighter): void {
    const before = { ...f.pos };
    if (f.dash) {
      const d = f.dash;
      const speed = d.skill.speed ?? 900;
      f.pos = add(f.pos, scale(d.dir, speed * DT));
      d.remaining -= DT;
      for (const e of this.enemiesOf(f)) {
        if (d.hit.has(e.uid) || dist(f.pos, e.pos) > f.def.radius + e.def.radius + 6) continue;
        d.hit.add(e.uid);
        this.applyEffects(f, e, d.skill.effects, d.skill, f.pos);
        this.emit({ type: 'impact', x: e.pos.x, y: e.pos.y, radius: 30, color: d.skill.color, skillId: d.skill.id });
        d.remaining = 0;
      }
      if (d.remaining <= 0 || this.outOfBounds(f.pos, f.def.radius)) f.dash = null;
    } else if (!f.stunned && !f.channel) {
      const mult = f.casting ? CAST_MOVE_MULT : f.swing ? SWING_MOVE_MULT : 1;
      f.pos = add(f.pos, scale(f.vel, DT * mult));
    }
    f.pos = add(f.pos, scale(f.knock, DT));
    f.knock = scale(f.knock, Math.exp(-KNOCK_DECAY * DT));
    this.clamp(f);

    // Standing still (pinned, stunned, rooted): turn back toward the enemy. While running, the AI
    // faces the way it's moving instead (see UtilityAI.steer).
    const target = this.nearestEnemy(f);
    if (target && dist(before, f.pos) < IDLE_MOVE && Math.abs(target.pos.x - f.pos.x) > 1) {
      f.facing = target.pos.x > f.pos.x ? 1 : -1;
    }
  }

  private outOfBounds(p: Vec, r: number): boolean {
    return p.x < r || p.y < r || p.x > this.arena.width - r || p.y > this.arena.height - r;
  }

  private clamp(f: Fighter): void {
    const r = f.def.radius;
    f.pos.x = Math.max(r, Math.min(this.arena.width - r, f.pos.x));
    f.pos.y = Math.max(r, Math.min(this.arena.height - r, f.pos.y));
  }

  private separateFighters(): void {
    const alive = this.fighters.filter((f) => f.alive);
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        const min = a.def.radius + b.def.radius;
        const d = dist(a.pos, b.pos);
        if (d >= min) continue;
        const push = scale(norm(sub(b.pos, a.pos)), (min - d) / 2);
        a.pos = sub(a.pos, push);
        b.pos = add(b.pos, push);
        this.clamp(a);
        this.clamp(b);
      }
    }
  }

  // ---- entities -------------------------------------------------------------------------------

  applyEffects(source: Fighter, target: Fighter, effects: Effect[], skill: SkillDef, origin: Vec): void {
    applyEffectsTo(this.effectCtx, source, target, effects, skill, origin);
  }

  spawnProjectile(owner: Fighter, skill: SkillDef, pos: Vec, vel: Vec): Projectile {
    const p: Projectile = {
      id: this.nextId++,
      owner,
      skill,
      pos,
      vel,
      radius: skill.radius ?? 8,
      ttl: (skill.range * 1.6) / Math.max(1, Math.hypot(vel.x, vel.y)),
    };
    this.projectiles.push(p);
    return p;
  }

  spawnBeam(owner: Fighter, skill: SkillDef, dir: Vec): Beam {
    const b: Beam = {
      id: this.nextId++,
      owner,
      skill,
      dir,
      length: skill.range,
      halfWidth: skill.radius ?? 16,
      remaining: skill.duration ?? 1,
      tickTimer: 0,
    };
    this.beams.push(b);
    return b;
  }

  spawnZone(owner: Fighter, skill: SkillDef, pos: Vec): Zone {
    const z: Zone = {
      id: this.nextId++,
      owner,
      skill,
      pos,
      radius: skill.radius ?? 100,
      remaining: skill.duration ?? 3,
      tickTimer: 0,
    };
    this.zones.push(z);
    return z;
  }

  /** Instant area hit centred on `center`. */
  burst(owner: Fighter, skill: SkillDef, center: Vec, radius: number): void {
    for (const e of this.enemiesOf(owner)) {
      if (dist(center, e.pos) <= radius + e.def.radius) this.applyEffects(owner, e, skill.effects, skill, center);
    }
    this.emit({ type: 'impact', x: center.x, y: center.y, radius, color: skill.color, skillId: skill.id });
  }

  private updateProjectiles(): void {
    const keep: Projectile[] = [];
    for (const p of this.projectiles) {
      p.pos = add(p.pos, scale(p.vel, DT));
      p.ttl -= DT;
      let alive = p.ttl > 0 && !this.outOfBounds(p.pos, -p.radius);
      if (alive && p.owner.alive) {
        for (const e of this.enemiesOf(p.owner)) {
          if (dist(p.pos, e.pos) > p.radius + e.def.radius) continue;
          if (p.skill.impactRadius) this.burst(p.owner, p.skill, p.pos, p.skill.impactRadius);
          else {
            this.applyEffects(p.owner, e, p.skill.effects, p.skill, p.pos);
            this.emit({ type: 'impact', x: p.pos.x, y: p.pos.y, radius: p.radius * 1.5, color: p.skill.color, skillId: p.skill.id });
          }
          alive = false;
          break;
        }
      }
      if (alive) keep.push(p);
    }
    this.projectiles = keep;
  }

  private updateBeams(): void {
    this.beams = this.beams.filter((b) => {
      const owner = b.owner;
      if (!owner.alive || owner.channel?.beamId !== b.id) return false;
      b.remaining -= DT;
      b.tickTimer -= DT;
      if (b.tickTimer <= 0) {
        b.tickTimer = b.skill.tickInterval ?? 0.1;
        const end = add(owner.pos, scale(b.dir, b.length));
        for (const e of this.enemiesOf(owner)) {
          if (distToSegment(e.pos, owner.pos, end) <= b.halfWidth + e.def.radius) {
            this.applyEffects(owner, e, b.skill.effects, b.skill, owner.pos);
          }
        }
      }
      return b.remaining > 0;
    });
  }

  private updateZones(): void {
    this.zones = this.zones.filter((z) => {
      if (!z.owner.alive) return false;
      z.remaining -= DT;
      z.tickTimer -= DT;
      if (z.tickTimer <= 0) {
        z.tickTimer = z.skill.tickInterval ?? 0.25;
        for (const e of this.enemiesOf(z.owner)) {
          if (dist(z.pos, e.pos) <= z.radius + e.def.radius) this.applyEffects(z.owner, e, z.skill.effects, z.skill, z.pos);
        }
      }
      return z.remaining > 0;
    });
  }

  private emitPassiveProcs(): void {
    for (const f of this.fighters) {
      for (const proc of f.passive.procs.splice(0)) {
        this.emit({ type: 'passive', uid: f.uid, passive: f.def.passive, proc, x: f.pos.x, y: f.pos.y });
      }
    }
  }

  // ---- match flow -----------------------------------------------------------------------------

  private checkDeaths(): void {
    for (const f of this.fighters) {
      if (f.hp <= 0) {
        if (this.koEmitted.has(f.uid)) continue;
        this.koEmitted.add(f.uid);
        f.hp = 0;
        f.casting = null;
        f.dash = null;
        f.channel = null;
        f.swing = null;
        f.statuses = [];
        this.emit({ type: 'ko', uid: f.uid });
      } else if (f.alive && f.hp <= f.maxHp * LOW_HP_LINE && !this.lowHpWarned.has(f.uid)) {
        this.lowHpWarned.add(f.uid);
        this.voice(f, 'hurt');
      }
    }
  }

  private checkEnd(): void {
    const teamsAlive = new Set(this.fighters.filter((f) => f.alive).map((f) => f.team));
    if (teamsAlive.size <= 1) {
      this.finish(teamsAlive.size === 1 ? [...teamsAlive][0] : -1, 'ko');
    } else if (this.time >= this.timeLimit) {
      // Time out: the team with the most remaining HP (as a fraction) wins.
      const teams = [...new Set(this.fighters.map((f) => f.team))];
      const score = (t: number) =>
        this.fighters.filter((f) => f.team === t).reduce((s, f) => s + f.hp / f.maxHp, 0);
      const ranked = teams.map((t) => ({ t, s: score(t) })).sort((a, b) => b.s - a.s);
      const draw = ranked.length > 1 && Math.abs(ranked[0].s - ranked[1].s) < 1e-6;
      this.finish(draw ? -1 : ranked[0].t, 'time');
    }
  }

  private finish(winnerTeam: number, reason: 'ko' | 'time'): void {
    this.over = true;
    this.winnerTeam = winnerTeam;
    this.endReason = reason;
    this.projectiles = [];
    this.beams = [];
    this.zones = [];
    for (const f of this.fighters) if (f.team === winnerTeam && f.alive) this.voice(f, 'win');
    this.emit({ type: 'matchEnd', winnerTeam, reason });
  }

  private voice(f: Fighter, key: keyof Fighter['def']['voiceLines']): void {
    const lines = f.def.voiceLines[key];
    if (lines.length) this.emit({ type: 'voiceLine', uid: f.uid, text: this.rng.pick(lines) });
  }
}
