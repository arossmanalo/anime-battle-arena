import { describe, expect, it } from 'vitest';
import { ROSTER, fighterById } from '../src/data/fighters';
import { applyEffects, takeDamage } from '../src/sim/effects';
import { DT, Simulation } from '../src/sim/Simulation';
import type { FighterDef, SimConfig, SimEvent } from '../src/sim/types';

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
