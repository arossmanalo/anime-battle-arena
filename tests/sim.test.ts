import { describe, expect, it } from 'vitest';
import { TRAINING_DUMMY } from '../src/data/dummy';
import { ROSTER, fighterById } from '../src/data/fighters';
import { draftOrder, fillTeam, maxDraftSize, pickForTeam } from '../src/sim/draft';
import { roleScores } from '../src/sim/roles';
import { applyEffects, gainUlt, takeDamage } from '../src/sim/effects';
import { Rng } from '../src/sim/rng';
import { DT, Simulation } from '../src/sim/Simulation';
import type { Effect, FighterDef, SimConfig, SimEvent, SkillDef } from '../src/sim/types';

function duel(a: string, b: string, seed = 1, extra: Partial<SimConfig> = {}): Simulation {
  return new Simulation({
    seed,
    teams: [[{ def: fighterById(a), controller: 'ai' }], [{ def: fighterById(b), controller: 'ai' }]],
    ...extra,
  });
}

function playerDuel(seed = 1): Simulation {
  return new Simulation({
    seed,
    idleFallback: 0,
    teams: [
      [{ def: fighterById('naruto'), controller: 'player' }],
      [{ def: fighterById('goku'), controller: 'ai' }],
    ],
  });
}

function stepCollect(sim: Simulation, ticks = 1): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < ticks; i++) {
    sim.step();
    out.push(...sim.drainEvents());
  }
  return out;
}

const ctx = { roll: () => 1, onHit: () => {} };

describe('determinism', () => {
  it('replays the same match from the same seed', () => {
    const a = duel('naruto', 'goku', 42);
    const b = duel('naruto', 'goku', 42);
    a.runToEnd();
    b.runToEnd();
    expect(a.tick).toBe(b.tick);
    expect(a.winnerTeam).toBe(b.winnerTeam);
    expect(a.fighters.map((f) => f.hp)).toEqual(b.fighters.map((f) => f.hp));
  });

  it('produces different matches from different seeds', () => {
    const results = new Set<string>();
    for (let seed = 1; seed <= 5; seed++) {
      const sim = duel('naruto', 'goku', seed);
      sim.runToEnd();
      results.add(`${sim.tick}:${sim.winnerTeam}`);
    }
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('damage and statuses', () => {
  it('shields absorb damage before HP', () => {
    const sim = duel('naruto', 'goku');
    const [n] = sim.fighters;
    n.statuses.push({ type: 'shield', remaining: 5, value: 20, source: n.uid });
    expect(takeDamage(n, 30)).toBe(10);
    expect(n.hp).toBe(n.maxHp - 10);
    expect(n.hasStatus('shield')).toBe(false);
  });

  it('applies the damage multiplier from buffs', () => {
    const sim = duel('naruto', 'goku');
    const [n, g] = sim.fighters;
    n.statuses.push({ type: 'damageBuff', remaining: 5, value: 1.5, source: n.uid });
    const skill = n.def.skills[0];
    applyEffects(ctx, n, g, [{ type: 'damage', amount: 10 }], skill, n.pos);
    expect(g.maxHp - g.hp).toBe(15);
    expect(n.stats.damageDealt).toBe(15);
  });

  it('invulnerable fighters take no damage', () => {
    const sim = duel('naruto', 'goku');
    const [n, g] = sim.fighters;
    g.invuln = 1;
    applyEffects(ctx, n, g, [{ type: 'damage', amount: 50 }], n.def.skills[0], n.pos);
    expect(g.hp).toBe(g.maxHp);
  });

  it('stuns interrupt a wind-up', () => {
    const sim = duel('naruto', 'goku');
    const [n, g] = sim.fighters;
    g.casting = { skill: g.def.skills[2], remaining: 0.5 };
    applyEffects(ctx, n, g, [{ type: 'stun', duration: 1 }], n.def.skills[2], n.pos);
    expect(g.casting).toBeNull();
    expect(g.stunned).toBe(true);
  });

  it('burn deals damage over time', () => {
    const sim = playerDuel();
    const [, g] = sim.fighters;
    g.statuses.push({ type: 'burn', remaining: 1, value: 10, source: 1 });
    g.invuln = 0;
    const before = g.hp;
    for (let i = 0; i < 30; i++) sim.step();
    // Half a second of 10 dps; Goku's AI may also take other damage, so only check the lower bound.
    expect(before - g.hp).toBeGreaterThanOrEqual(4.9);
  });
});

describe('cast gating', () => {
  it('rejects a skill without enough energy', () => {
    const sim = playerDuel();
    const [n] = sim.fighters;
    n.energy = 0;
    sim.command({ type: 'castSkill', uid: n.uid, slot: 1 });
    const events = stepCollect(sim);
    expect(events).toContainEqual({ type: 'castFailed', uid: n.uid, reason: 'energy' });
  });

  it('spends energy, starts the cooldown, then rejects a recast', () => {
    const sim = playerDuel();
    const [n] = sim.fighters;
    n.energy = 100;
    sim.command({ type: 'castSkill', uid: n.uid, slot: 0 });
    let events = stepCollect(sim);
    expect(events.some((e) => e.type === 'skillCast' && e.uid === n.uid)).toBe(true);
    expect(n.energy).toBeLessThan(100);

    stepCollect(sim, 30); // let the wind-up finish
    sim.command({ type: 'castSkill', uid: n.uid, slot: 0 });
    events = stepCollect(sim);
    expect(events).toContainEqual({ type: 'castFailed', uid: n.uid, reason: 'cooldown' });
  });

  it('the ultimate needs a full ultimate meter and empties it', () => {
    const sim = playerDuel();
    const [n] = sim.fighters;
    n.energy = 100;
    n.ult = 99;
    expect(sim.tryCast(n, 4)).toBe('energy');
    n.ult = 100;
    expect(sim.tryCast(n, 4)).toBeNull();
    expect(n.ult).toBe(0);
    expect(n.energy).toBe(100);
  });

  it('players on manual never get AI casts when idle fallback is off', () => {
    const sim = playerDuel();
    const [n] = sim.fighters;
    for (let i = 0; i < 600; i++) sim.step();
    expect(n.stats.skillsUsed).toBe(0);
  });

  it('Auto mode lets the AI cast for the player', () => {
    const sim = playerDuel();
    const [n] = sim.fighters;
    sim.command({ type: 'setAuto', uid: n.uid, auto: true });
    for (let i = 0; i < 600; i++) sim.step();
    expect(n.stats.skillsUsed).toBeGreaterThan(0);
  });
});

describe('transformations', () => {
  it('only unlock below the HP threshold with enough energy', () => {
    const sim = playerDuel();
    const [n] = sim.fighters;
    n.energy = 100;
    expect(sim.tryTransform(n)).toBe(false);
    n.hp = n.maxHp * 0.4;
    expect(sim.tryTransform(n)).toBe(true);
    expect(n.form?.id).toBe('naruto.kurama');
    expect(n.speed).toBeGreaterThan(n.def.speed);
    expect(sim.tryTransform(n)).toBe(false);
  });

  it('swap in form skill overrides', () => {
    const sim = duel('goku', 'naruto');
    const [g] = sim.fighters;
    expect(g.skill(2).id).toBe('goku.kamehameha');
    g.hp = g.maxHp * 0.3;
    g.energy = 100;
    sim.tryTransform(g);
    expect(g.skill(2).id).toBe('goku.superkamehameha');
  });
});

describe('match flow', () => {
  it('every matchup finishes, mostly by KO, before the time limit', () => {
    let kos = 0;
    let total = 0;
    for (const a of ROSTER) {
      for (const b of ROSTER) {
        if (a === b) continue;
        const sim = duel(a.id, b.id, total + 7);
        sim.runToEnd();
        expect(sim.over).toBe(true);
        expect(sim.time).toBeLessThanOrEqual(sim.timeLimit + DT);
        if (sim.endReason === 'ko') kos++;
        total++;
      }
    }
    expect(kos / total).toBeGreaterThan(0.8);
  });

  it('every skill kind fires at least once across the roster', () => {
    const seen = new Set<string>();
    for (let i = 0; i < ROSTER.length; i++) {
      const sim = duel(ROSTER[i].id, ROSTER[(i + 1) % ROSTER.length].id, i + 1);
      while (!sim.over) {
        sim.step();
        for (const e of sim.drainEvents()) if (e.type === 'skillFired') seen.add(e.skill.kind);
      }
    }
    expect([...seen].sort()).toEqual(['aoe', 'beam', 'buff', 'dash', 'projectile', 'zone']);
  });

  it('every fighter definition is well-formed', () => {
    const ids = new Set<string>();
    const check = (def: FighterDef) => {
      for (const s of [...def.skills, def.ultimate]) {
        expect(ids.has(s.id), `duplicate skill id ${s.id}`).toBe(false);
        ids.add(s.id);
        expect(s.energyCost).toBeGreaterThanOrEqual(0);
        expect(s.cooldown).toBeGreaterThan(0);
      }
      expect(def.ultimate.ultimate).toBe(true);
      expect(def.ultimate.energyCost).toBe(0);
    };
    ROSTER.forEach(check);
  });
});

describe('passives', () => {
  const hit: Effect[] = [{ type: 'damage', amount: 10 }];
  const skill = (id: string) => ({ id, name: id, kind: 'projectile', energyCost: 0, cooldown: 1, castTime: 0, range: 1, effects: hit, color: 0 }) as SkillDef;

  it("Gojo's Limitless blocks its quota of attacks, then recharges", () => {
    const sim = duel('naruto', 'gojo');
    const [n, g] = sim.fighters;
    const p = g.def.passive;
    if (p.kind !== 'barrier') throw new Error('Gojo should have a barrier passive');
    sim.tryAttack = () => false; // keep the AI's default attacks out of the way
    g.invuln = 0;
    for (let i = 0; i < p.hits; i++) applyEffects(ctx, n, g, hit, skill(`s${i}`), n.pos);
    expect(g.hp).toBe(g.maxHp);
    applyEffects(ctx, n, g, hit, skill('extra'), n.pos);
    expect(g.hp).toBeLessThan(g.maxHp);
    const events = stepCollect(sim, Math.ceil((p.cooldown + 0.1) / DT));
    expect(g.passive.hitsLeft).toBe(p.hits);
    expect(events.some((e) => e.type === 'passive' && e.proc === 'recharged')).toBe(true);
  });

  it('a beam ticking many times counts as one blocked attack', () => {
    const sim = duel('naruto', 'gojo');
    const [n, g] = sim.fighters;
    g.invuln = 0;
    const beam = skill('beam');
    for (let i = 0; i < 10; i++) applyEffects(ctx, n, g, hit, beam, n.pos);
    expect(g.hp).toBe(g.maxHp);
    expect(g.passive.hitsLeft).toBe(g.def.passive.kind === 'barrier' ? g.def.passive.hits - 1 : -1);
  });

  it("Sasuke's Sharingan evades roughly its chance of attacks", () => {
    const [n, s] = duel('naruto', 'sasuke').fighters;
    s.invuln = 0;
    const rng = new Rng(7);
    const rollCtx = { roll: () => rng.range(0.9, 1.1), onHit: () => {} };
    let evaded = 0;
    const attacks = 2000;
    for (let i = 0; i < attacks; i++) {
      s.hp = s.maxHp;
      applyEffects(rollCtx, n, s, hit, skill(`a${i}`), n.pos);
      if (s.hp === s.maxHp) evaded++;
      s.passive.decided.clear();
    }
    const chance = s.def.passive.kind === 'dodge' ? s.def.passive.chance : -1;
    expect(Math.abs(evaded / attacks - chance)).toBeLessThan(0.03);
  });

  it("Goku's Zenkai raises damage as HP falls", () => {
    const [, g] = duel('naruto', 'goku').fighters;
    const full = g.damageMult;
    g.hp = g.maxHp / 2;
    expect(g.damageMult).toBeCloseTo(full * 1.15, 5);
  });

  it("Naruto's Kurama's Vitality only heals at or below 50% HP", () => {
    const sim = duel('naruto', 'goku');
    const [n] = sim.fighters;
    n.invuln = 99;
    sim.tryCast = () => 'busy';
    const start = n.hp;
    for (let i = 0; i < 60; i++) sim.step();
    expect(n.hp).toBe(start);
    n.hp = n.maxHp * 0.4;
    const low = n.hp;
    for (let i = 0; i < 60; i++) sim.step();
    expect(n.hp).toBeGreaterThan(low + 1.5);
  });

  it("Vegeta's Saiyan Elite charges the ultimate faster", () => {
    const [n, v] = duel('naruto', 'vegeta').fighters;
    gainUlt(n, 10);
    gainUlt(v, 10);
    const p = v.def.passive;
    expect(p.kind === 'ultCharge' ? v.ult : -1).toBeCloseTo(p.kind === 'ultCharge' ? 10 * p.mult : 0, 5);
    expect(n.ult).toBeCloseTo(10, 5);
  });

  it("Tanjiro's Unbreakable Resolve survives one lethal hit", () => {
    const [, t] = duel('naruto', 'tanjiro').fighters;
    t.invuln = 0;
    t.hp = 5;
    takeDamage(t, 500);
    expect(t.hp).toBe(1);
    expect(t.invuln).toBeGreaterThan(0);
    t.invuln = 0;
    takeDamage(t, 500);
    expect(t.hp).toBe(0);
  });

  it('every fighter has a passive with a unique id', () => {
    const ids = ROSTER.map((f) => f.passive.id);
    expect(new Set(ids).size).toBe(ROSTER.length);
    for (const f of ROSTER) expect(f.passive.description.length).toBeGreaterThan(5);
  });
});

describe('default attacks', () => {
  /** Two fighters; the AI's own attacks are switched off so the tests start swings by hand via `tryAttack`. */
  function setup(a: string, b: string) {
    const sim = duel(a, b);
    const tryAttack = sim.tryAttack.bind(sim);
    sim.tryAttack = () => false;
    const [x, y] = sim.fighters;
    for (const f of sim.fighters) f.auto = false; // no AI skill casts either
    return { sim, x, y, tryAttack };
  }
  const settle = (sim: Simulation, ticks: number) => {
    for (let i = 0; i < ticks; i++) {
      sim.step();
    }
  };

  it('does not start without an enemy in reach', () => {
    const { x, y, tryAttack } = setup('naruto', 'goku');
    y.pos = { x: x.pos.x + 300, y: x.pos.y };
    expect(tryAttack(x)).toBe(false);
  });

  it('a melee swing lands after its wind-up and chains into a stronger finisher', () => {
    const { sim, x, y, tryAttack } = setup('tanjiro', 'goku');
    y.pos = { x: x.pos.x + 40, y: x.pos.y };
    y.invuln = 0;
    const a = x.def.attack;
    const damages: number[] = [];
    for (let hit = 0; hit < a.combo; hit++) {
      x.attackCd = 0;
      const before = y.hp;
      expect(tryAttack(x)).toBe(true);
      expect(y.hp).toBe(before); // nothing yet: still winding up
      stepCollect(sim, Math.ceil(a.windup / DT) + 2);
      damages.push(before - y.hp);
    }
    expect(damages[0]).toBeGreaterThan(0);
    expect(damages[a.combo - 1]).toBeGreaterThan(damages[0]);
    expect(x.combo).toBe(0); // finisher resets the chain
  });

  it('a whiff drops the combo', () => {
    const { sim, x, y, tryAttack } = setup('tanjiro', 'goku');
    y.pos = { x: x.pos.x + 40, y: x.pos.y };
    tryAttack(x);
    y.pos = { x: x.pos.x + 400, y: x.pos.y };
    settle(sim, 20);
    expect(x.combo).toBe(0);
  });

  it('casting a skill cancels a swing, and stun does too', () => {
    const { sim, x, y, tryAttack } = setup('tanjiro', 'goku');
    y.pos = { x: x.pos.x + 40, y: x.pos.y };
    x.energy = 100;
    tryAttack(x);
    expect(x.swinging).toBe(true);
    expect(sim.tryCast(x, 0)).toBeNull();
    expect(x.swinging).toBe(false);

    x.casting = null;
    x.attackCd = 0;
    tryAttack(x);
    applyEffects(ctx, y, x, [{ type: 'stun', duration: 1 }], x.skill(0), y.pos);
    expect(x.swinging).toBe(false);
  });

  it('a ranged attack fires a projectile', () => {
    const { sim, x, y, tryAttack } = setup('vegeta', 'goku');
    y.pos = { x: x.pos.x + 200, y: x.pos.y };
    expect(tryAttack(x)).toBe(true);
    settle(sim, Math.ceil(x.def.attack.windup / DT) + 2);
    expect(sim.projectiles.some((p) => p.owner === x)).toBe(true);
  });

  it('default attacks go through passives and damage buffs', () => {
    const { sim, x, y, tryAttack } = setup('tanjiro', 'gojo');
    y.pos = { x: x.pos.x + 40, y: x.pos.y };
    y.invuln = 0;
    tryAttack(x);
    settle(sim, Math.ceil(x.def.attack.windup / DT) + 2);
    expect(y.hp).toBe(y.maxHp); // Limitless blocked it
    expect(y.passive.hitsLeft).toBe(1);
  });

  it('every fighter has a sensible default attack', () => {
    for (const f of ROSTER) {
      const a = f.attack;
      expect(a.damage).toBeGreaterThan(0);
      expect(a.cooldown).toBeGreaterThan(0);
      expect(a.combo).toBeGreaterThanOrEqual(1);
      expect(a.range).toBeGreaterThan(0);
      if (a.style === 'ranged') expect(a.speed).toBeGreaterThan(0);
    }
  });
});

describe('training mode', () => {
  function training(id = 'gojo') {
    return new Simulation({
      seed: 1,
      idleFallback: 0,
      training: true,
      teams: [[{ def: fighterById(id), controller: 'player' }], [{ def: TRAINING_DUMMY, controller: 'dummy' }]],
    });
  }

  it('gives the player infinite energy and a full ultimate meter', () => {
    const sim = training();
    const [p] = sim.fighters;
    p.energy = 0;
    p.ult = 0;
    sim.step();
    expect(p.energy).toBe(p.maxEnergy);
    expect(p.ult).toBe(p.maxUlt);
    expect(sim.tryCast(p, 4)).toBeNull();
    sim.step();
    expect(p.ult).toBe(p.maxUlt);
  });

  it('never ends, and the dummy cannot be killed', () => {
    const sim = training();
    const [p, d] = sim.fighters;
    p.invuln = 0;
    applyEffects(ctx, p, d, [{ type: 'damage', amount: 99999 }], p.skill(0), p.pos);
    sim.step();
    expect(d.hp).toBe(d.maxHp);
    expect(d.alive).toBe(true);
    for (let i = 0; i < 60 * 120; i++) sim.step();
    expect(sim.over).toBe(false);
    expect(sim.winnerTeam).toBe(-1);
  });

  it('the dummy stays put, returns after a knockback and can pace', () => {
    const sim = training();
    const [, d] = sim.fighters;
    const home = { ...d.home };
    d.knock = { x: 900, y: 0 };
    for (let i = 0; i < 60 * 3; i++) sim.step();
    expect(Math.hypot(d.pos.x - home.x, d.pos.y - home.y)).toBeLessThan(8);
    sim.dummyMode = 'pace';
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < 60 * 8; i++) {
      sim.step();
      minY = Math.min(minY, d.pos.y);
      maxY = Math.max(maxY, d.pos.y);
    }
    expect(maxY - minY).toBeGreaterThan(80);
  });

  it('can transform any time, and again to turn the form off', () => {
    const sim = training('goku');
    const [p] = sim.fighters;
    expect(p.canTransform).toBe(true);
    sim.tryTransform(p);
    expect(p.transformed).toBe(true);
    expect(p.canTransform).toBe(true);
    sim.tryTransform(p);
    expect(p.transformed).toBe(false);
  });

  it('can switch cooldowns off and reset everything', () => {
    const sim = training('naruto');
    const [p, d] = sim.fighters;
    sim.tryCast(p, 0);
    expect(p.cooldown(p.skill(0))).toBeGreaterThan(0);
    sim.noCooldowns = true;
    sim.step();
    expect(p.cooldown(p.skill(0))).toBe(0);
    d.stats.damageTaken = 50;
    d.pos = { x: 10, y: 10 };
    sim.resetTraining();
    expect(d.stats.damageTaken).toBe(0);
    expect(d.pos).toEqual(d.home);
  });

  it('is not used by normal matches', () => {
    const sim = duel('naruto', 'goku');
    expect(sim.training).toBe(false);
    expect(sim.fighters.every((f) => !f.sandbox)).toBe(true);
  });
});

describe("Sukuna's new mechanics", () => {
  const dmg = (amount: number, pierce?: number): Effect[] => [{ type: 'damage', amount, pierce }];
  const sk = (id: string) => ({ id, name: id, kind: 'dash', energyCost: 0, cooldown: 1, castTime: 0, range: 1, effects: [], color: 0 }) as SkillDef;

  it('piercing damage skips part of a shield', () => {
    const [a, b] = duel('sukuna', 'goku').fighters;
    b.invuln = 0;
    b.statuses.push({ type: 'shield', remaining: 5, value: 100, source: b.uid });
    const before = b.hp;
    takeDamage(b, 20, 0.5);
    expect(before - b.hp).toBe(10); // half pierced, half absorbed
    expect(b.statuses[0].value).toBe(90);
    void a;
  });

  it('marks stack on projectile/dash/area hits and burst at three', () => {
    const sim = duel('sukuna', 'goku');
    const [s, g] = sim.fighters;
    g.invuln = 0;
    const p = s.def.passive;
    if (p.kind !== 'marks') throw new Error('Sukuna should have marks');
    for (let i = 0; i < p.stacks; i++) applyEffects(ctx, s, g, dmg(5), sk(`d${i}`), s.pos);
    expect(g.passive.marks).toBe(p.stacks);
    const before = g.hp;
    applyEffects(ctx, s, g, dmg(5), sk('d9'), s.pos);
    expect(before - g.hp).toBeGreaterThanOrEqual(5 + p.bonus - 1); // the hit plus the burst
    expect(g.passive.marks).toBe(0);
  });

  it('marks fade if he stops attacking', () => {
    const sim = duel('sukuna', 'goku');
    const [s, g] = sim.fighters;
    sim.tryAttack = () => false; // the AI must not keep attacking (and re-marking) while we wait
    for (const f of sim.fighters) f.auto = false;
    g.invuln = 0;
    applyEffects(ctx, s, g, dmg(5), sk('d1'), s.pos);
    expect(g.passive.marks).toBe(1);
    const p = s.def.passive;
    stepCollect(sim, Math.ceil(((p.kind === 'marks' ? p.expire : 4) + 0.5) / DT));
    expect(g.passive.marks).toBe(0);
  });

  it('the domain deals its finale once when it ends, and cannot be stunned while opening', () => {
    const sim = duel('sukuna', 'goku');
    const [s, g] = sim.fighters;
    s.ult = 100;
    for (const f of sim.fighters) f.auto = false;
    sim.tryCast(s, 4);
    expect(s.casting?.skill.uninterruptible).toBe(true);
    applyEffects(ctx, g, s, [{ type: 'stun', duration: 1 }], g.skill(0), g.pos);
    expect(s.casting).not.toBeNull(); // not interrupted
    expect(s.stunned).toBe(false);
    g.pos = { x: s.pos.x + 150, y: s.pos.y };
    g.invuln = 0;
    const hits: number[] = [];
    for (let i = 0; i < 60 * 5; i++) {
      sim.step();
      for (const e of sim.drainEvents()) if (e.type === 'hit' && e.target === g.uid) hits.push(e.damage);
    }
    expect(Math.max(...hits)).toBeGreaterThanOrEqual(25); // the finale
    expect(hits.filter((h) => h >= 25).length).toBe(1);
  });
});

describe('team mechanics', () => {
  function team(a: string[], b: string[], seed = 3): Simulation {
    return new Simulation({
      seed,
      idleFallback: 0,
      teams: [a.map((id) => ({ def: fighterById(id), controller: 'ai' as const })), b.map((id) => ({ def: fighterById(id), controller: 'ai' as const }))],
    });
  }

  /** A team match where nobody casts or attacks by themselves, so a test controls exactly what happens. */
  function quiet(a: string[], b: string[]): Simulation {
    const sim = team(a, b);
    sim.tryAttack = () => false;
    for (const f of sim.fighters) f.auto = false;
    return sim;
  }

  it('healers heal the lowest ally and cleanse them', () => {
    const sim = quiet(['naruto', 'vegeta'], ['goku', 'sukuna']);
    const [n, v] = sim.fighters;
    n.energy = 100;
    v.hp = 100;
    v.statuses.push({ type: 'burn', remaining: 5, value: 3, source: 3 });
    expect(sim.tryCast(n, 3)).toBeNull();
    stepCollect(sim, Math.ceil(0.5 / DT));
    expect(v.hp).toBeGreaterThan(100 + 20);
    expect(v.hasStatus('burn')).toBe(false);
  });

  it('a taunt forces enemies to target the taunter', () => {
    const sim = quiet(['sasuke', 'vegeta'], ['goku', 'sukuna']);
    const [s, v, g] = sim.fighters;
    g.focus = v;
    expect(sim.nearestEnemy(g)).toBe(v);
    s.pos = { x: g.pos.x - 80, y: g.pos.y };
    s.energy = 100;
    sim.tryCast(s, 3);
    stepCollect(sim, Math.ceil(0.5 / DT));
    expect(g.tauntedBy).toBe(s.uid);
    expect(sim.nearestEnemy(g)).toBe(s);
  });

  it('guard reduces damage taken', () => {
    const sim = team(['sasuke', 'vegeta'], ['goku', 'sukuna']);
    const [s, , g] = sim.fighters;
    s.invuln = 0;
    const base = { type: 'damage', amount: 20 } as Effect;
    const sk = { id: 'x', name: 'x', kind: 'aoe', energyCost: 0, cooldown: 1, castTime: 0, range: 1, effects: [], color: 0 } as SkillDef;
    const before = s.hp;
    applyEffects(ctx, g, s, [base], sk, g.pos);
    const unguarded = before - s.hp;
    s.hp = before;
    s.statuses.push({ type: 'guard', remaining: 5, value: 0.5, source: s.uid });
    applyEffects(ctx, g, s, [base], sk, g.pos);
    expect(before - s.hp).toBeLessThan(unguarded * 0.7);
  });

  it('healing weakens and defence drops as a team match drags on', () => {
    const sim = quiet(['naruto', 'vegeta'], ['goku', 'sukuna']);
    expect(sim.decayProgress()).toBe(0);
    sim.tick = Math.round(90 / DT);
    expect(sim.decayProgress()).toBe(1);
    const [n, v] = sim.fighters;
    v.hp = 100;
    n.energy = 100;
    sim.tryCast(n, 3);
    stepCollect(sim, Math.ceil(0.6 / DT));
    expect(v.hp - 100).toBeLessThan(25); // 48 healed at 30% strength
  });

  it('one-on-one matches have no decay and keep their time limit', () => {
    const sim = duel('naruto', 'goku');
    expect(sim.decay).toBe(false);
    expect(sim.timeLimit).toBe(99);
    expect(sim.fighters.every((f) => !f.teamMode)).toBe(true);
  });

  it('team kits only apply in team matches', () => {
    const solo = duel('naruto', 'goku');
    expect(solo.fighters[0].skill(3).id).toBe('naruto.sage');
    const squad = team(['naruto', 'vegeta'], ['goku', 'sukuna']);
    expect(squad.fighters[0].skill(3).name).toBe('Sage Healing');
  });

  it('back-row fighters start behind the front row', () => {
    const sim = team(['gojo', 'sasuke'], ['goku', 'vegeta']);
    const [gojo, sasuke] = sim.fighters;
    expect(gojo.row).toBe('back');
    expect(sasuke.row).toBe('front');
    expect(gojo.pos.x).toBeLessThan(sasuke.pos.x);
  });

  it('team matches are deterministic', () => {
    const run = () => {
      const sim = team(['naruto', 'sasuke'], ['goku', 'gojo'], 9);
      sim.runToEnd();
      return [sim.tick, sim.winnerTeam, ...sim.fighters.map((f) => Math.round(f.hp))].join(',');
    };
    expect(run()).toBe(run());
  });

  it('every team matchup finishes', () => {
    for (let i = 0; i < ROSTER.length; i++) {
      const sim = team([ROSTER[i].id, ROSTER[(i + 1) % ROSTER.length].id], [ROSTER[(i + 2) % ROSTER.length].id, ROSTER[(i + 3) % ROSTER.length].id], i + 1);
      sim.runToEnd();
      expect(sim.over).toBe(true);
    }
  });
});

describe('draft and smart picker', () => {
  const rng = () => 0.5;

  it('the snake order is player, CPU, CPU, player, ...', () => {
    expect(draftOrder(2)).toEqual([true, false, false, true]);
    expect(draftOrder(3)).toEqual([true, false, false, true, true, false]);
    expect(draftOrder(3).filter(Boolean).length).toBe(3);
  });

  it('the smart picker covers roles: a team with no support picks one', () => {
    const team = [fighterById('vegeta'), fighterById('sukuna')];
    const pick = pickForTeam(team, ROSTER, 3, rng);
    expect(pick && roleScores(pick).support + roleScores(pick).tank).toBeGreaterThan(0.3);
  });

  it('fillTeam makes a full team without duplicates, and respects unavailable fighters', () => {
    const team = fillTeam([], ROSTER, 4, rng, new Set(['naruto']));
    expect(team.length).toBe(4);
    expect(new Set(team.map((d) => d.id)).size).toBe(4);
    expect(team.some((d) => d.id === 'naruto')).toBe(false);
  });

  it('a draft can only be as big as half the roster', () => {
    expect(maxDraftSize(7)).toBe(3);
    expect(maxDraftSize(8)).toBe(4);
  });
});

describe('team orders', () => {
  function squad(): Simulation {
    return new Simulation({
      seed: 4,
      idleFallback: 0,
      teams: [
        ['sasuke', 'naruto', 'vegeta'].map((id) => ({ def: fighterById(id), controller: 'ai' as const })),
        ['goku', 'gojo', 'tanjiro'].map((id) => ({ def: fighterById(id), controller: 'ai' as const })),
      ],
    });
  }

  it('a focus order makes the whole team target that enemy', () => {
    const sim = squad();
    const target = sim.fighters.find((f) => f.def.id === 'tanjiro')!;
    sim.command({ type: 'order', team: 0, order: { focus: target.uid } });
    stepCollect(sim, 40);
    for (const f of sim.fighters.filter((x) => x.team === 0)) expect(f.focus).toBe(target);
  });

  it('orders naming the wrong side are dropped', () => {
    const sim = squad();
    const mate = sim.fighters.find((f) => f.def.id === 'naruto')!;
    sim.command({ type: 'order', team: 0, order: { focus: mate.uid } });
    sim.step();
    expect(sim.ordersOf(0).focus).toBeNull();
  });

  it('hold ultimates stops the AI casting them, but a manual cast still works', () => {
    const sim = squad();
    sim.command({ type: 'order', team: 0, order: { holdUlts: true } });
    const v = sim.fighters.find((f) => f.def.id === 'vegeta')!;
    v.ult = 100;
    v.energy = 100;
    let cast = false;
    for (const e of stepCollect(sim, 60 * 8)) if (e.type === 'skillCast' && e.uid === v.uid && e.skill.ultimate) cast = true;
    expect(cast).toBe(false);
    v.casting = null;
    v.swing = null;
    v.dash = null;
    v.channel = null;
    v.statuses = [];
    v.ult = 100;
    v.energy = 100;
    sim.command({ type: 'castSkill', uid: v.uid, slot: 4 });
    const events = stepCollect(sim, 2);
    expect(events.some((e) => e.type === 'skillCast' && e.uid === v.uid && e.skill.ultimate)).toBe(true);
  });

  it('protect makes a healer favour that ally even when another is lower', () => {
    const sim = squad();
    for (const f of sim.fighters) f.auto = false;
    const [sasuke, naruto, vegeta] = sim.fighters;
    sasuke.hp = sasuke.maxHp * 0.9;
    vegeta.hp = vegeta.maxHp * 0.4;
    naruto.energy = 100;
    sim.command({ type: 'order', team: 0, order: { protect: sasuke.uid } });
    sim.step();
    const before = sasuke.hp;
    sim.tryCast(naruto, 3);
    stepCollect(sim, Math.ceil(0.6 / DT));
    expect(sasuke.hp).toBeGreaterThan(before);
  });

  it('team domains are limited to a circle in team battles', () => {
    const sim = squad();
    const z = sim.spawnZone(sim.fighters[0], { ...fighterById('gojo').form!.skillOverrides![0]!, domain: true }, { x: 100, y: 100 });
    expect(z.radius).toBeLessThanOrEqual(sim.arena.height * 0.55 + 0.01);
    const solo = duel('gojo', 'naruto');
    const sz = solo.spawnZone(solo.fighters[0], fighterById('gojo').form!.skillOverrides![0]!, { x: 100, y: 100 });
    expect(sz.radius).toBe(600);
  });
});

describe('Nezuko awakening', () => {
  it('the awakening meter fills from support and fighting, and a full meter unlocks the form', () => {
    const sim = duel('nezuko', 'naruto');
    const nez = sim.fighters[0];
    const foe = sim.fighters[1];
    expect(nez.canTransform).toBe(false);
    nez.hp = nez.maxHp - 100;
    sim.applyEffects(nez, nez, [{ type: 'heal', amount: 60 }], nez.skill(1), nez.pos);
    expect(nez.passive.meter).toBeGreaterThan(0);
    const before = nez.passive.meter;
    sim.applyEffects(nez, foe, [{ type: 'damage', amount: 20 }], nez.skill(0), nez.pos);
    expect(nez.passive.meter).toBeGreaterThan(before);
    nez.passive.meter = 100;
    nez.energy = 0;
    expect(nez.canTransform).toBe(true);
  });

  it('awakening is permanent and swaps her stats, attack, passive and kit', () => {
    const sim = duel('nezuko', 'naruto');
    const nez = sim.fighters[0];
    const hp = nez.maxHp;
    nez.passive.meter = 100;
    expect(sim.tryTransform(nez)).toBe(true);
    expect(nez.maxHp).toBeGreaterThan(hp);
    expect(nez.passiveDef.kind).toBe('regen');
    expect(nez.attack.name).toBe('Demon Fury');
    expect(nez.skill(2).id).toBe('nezuko.guardiansinstinct');
    expect(nez.skill(4).id).toBe('nezuko.crimsonwrath');
    sim.runToEnd(Math.ceil(20 / DT));
    if (nez.alive) expect(nez.transformed).toBe(true);
  });

  it('awakened she takes less damage and knockback', () => {
    const sim = duel('nezuko', 'naruto');
    const nez = sim.fighters[0];
    const foe = sim.fighters[1];
    const hit: Effect[] = [{ type: 'damage', amount: 40 }];
    const trial = (): number => {
      nez.hp = nez.maxHp;
      nez.statuses = [];
      const before = nez.hp;
      sim.applyEffects(foe, nez, hit, foe.skill(0), foe.pos);
      return before - nez.hp;
    };
    const base = Array.from({ length: 8 }, trial).reduce((a, b) => a + b, 0);
    nez.form = nez.def.form!;
    const awake = Array.from({ length: 8 }, trial).reduce((a, b) => a + b, 0);
    expect(awake).toBeLessThan(base);
  });

  it('she shields herself when no ally is near', () => {
    const sim = duel('nezuko', 'naruto');
    const nez = sim.fighters[0];
    nez.energy = 100;
    sim.tryCast(nez, 2);
    for (let i = 0; i < Math.ceil(0.6 / DT); i++) sim.step();
    expect(nez.hasStatus('shield')).toBe(true);
  });
});

