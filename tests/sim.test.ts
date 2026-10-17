import { describe, expect, it } from 'vitest';
import { ROSTER, fighterById } from '../src/data/fighters';
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
