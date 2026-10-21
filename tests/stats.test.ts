import { describe, expect, it } from 'vitest';
import { fighterById } from '../src/data/fighters';
import { Simulation } from '../src/sim/Simulation';
import { awards, contributions, jobsOf, teamTotals, type ResultFighter } from '../src/ui/resultStats';

const sum = (r: Record<string, number>): number => Object.values(r).reduce((a, b) => a + b, 0);

function play(a: string[], b: string[], seed = 4): Simulation {
  const sim = new Simulation({
    seed,
    teams: [a.map((id) => ({ def: fighterById(id), controller: 'ai' as const })), b.map((id) => ({ def: fighterById(id), controller: 'ai' as const }))],
  });
  sim.runToEnd();
  return sim;
}

describe('match statistics', () => {
  it('every point of damage is booked to a skill, a target and a source', () => {
    for (const [a, b] of [[['naofumi'], ['goku']], [['gojo', 'sakura'], ['sukuna', 'nezuko']], [['naofumi', 'lelouch'], ['broly', 'vegeta']]]) {
      const sim = play(a, b);
      for (const f of sim.fighters) {
        const s = f.stats;
        expect(Math.abs(sum(s.bySkill) - s.damageDealt)).toBeLessThan(1.5);
        expect(Math.abs(sum(s.dealtTo) - s.damageDealt)).toBeLessThan(1.5);
        expect(Math.abs(sum(s.takenFrom) - s.damageTaken)).toBeLessThan(1.5);
        expect(s.reflected).toBeLessThanOrEqual(s.damageDealt + 0.01);
      }
    }
  });

  it('credits knockouts and records when fighters fell', () => {
    const sim = play(['goku'], ['sakura']);
    const [goku, sakura] = sim.fighters;
    const loser = goku.alive ? sakura : goku;
    const winner = loser === goku ? sakura : goku;
    expect(loser.stats.diedAt).not.toBeNull();
    expect(winner.stats.kills).toBe(1);
    expect(winner.stats.diedAt).toBeNull();
  });

  it('counts shields, soaked damage and reflection for Naofumi', () => {
    const sim = play(['naofumi', 'sakura'], ['goku', 'vegeta'], 8);
    const nao = sim.fighters[0];
    expect(nao.stats.shieldGiven).toBeGreaterThan(0);
    expect(nao.stats.damageProtected + nao.stats.damageBlocked).toBeGreaterThan(0);
    expect(nao.stats.ultsUsed + nao.stats.skillsUsed).toBeGreaterThan(0);
  });
});

describe('contribution maths', () => {
  const fake = (uid: number, team: number, dealt: number, taken: number, heal: number): ResultFighter =>
    ({
      uid,
      id: 'goku',
      name: `F${uid}`,
      color: 0,
      hpLeft: 1,
      maxHp: 1,
      damageDealt: dealt,
      skillsUsed: 0,
      hits: 0,
      transformed: false,
      team,
      stats: { ...structuredClone(fighterStats()), damageDealt: dealt, damageTaken: taken, healingDone: heal },
    }) as ResultFighter;
  function fighterStats() {
    return new Simulation({ seed: 1, teams: [[{ def: fighterById('goku'), controller: 'ai' }], [{ def: fighterById('naruto'), controller: 'ai' }]] }).fighters[0].stats;
  }

  it('team scores add up to 1 and ignore jobs nobody did', () => {
    const fs = [fake(1, 0, 300, 0, 0), fake(2, 0, 100, 400, 0), fake(3, 1, 50, 50, 0)];
    const c = contributions(fs);
    expect((c.get(1)!.score + c.get(2)!.score)).toBeCloseTo(1, 5);
    expect(c.get(3)!.score).toBeCloseTo(1, 5);
    expect(jobsOf(fs[1]).defence).toBe(400);
  });

  it('awards go to the right fighter and the team totals add up', () => {
    const fs = [fake(1, 0, 300, 0, 0), fake(2, 0, 100, 400, 90)];
    const a = awards(fs, 0);
    expect(a.find((x) => x.key === 'damage')!.fighter.uid).toBe(1);
    expect(a.find((x) => x.key === 'tank')!.fighter.uid).toBe(2);
    expect(a.find((x) => x.key === 'support')!.fighter.uid).toBe(2);
    expect(teamTotals(fs).damage).toBe(400);
  });
});
