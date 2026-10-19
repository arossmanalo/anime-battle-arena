import { describe, expect, it } from 'vitest';
import { fighterById } from '../src/data/fighters';
import { DT, Simulation } from '../src/sim/Simulation';
import type { SimEvent, SkillDef } from '../src/sim/types';

const HIT: SkillDef = {
  id: 'test.hit',
  name: 'Test hit',
  kind: 'aoe',
  energyCost: 0,
  cooldown: 0,
  castTime: 0,
  range: 0,
  effects: [],
  color: 0xffffff,
};

function bout(foe = 'naruto'): { sim: Simulation; nao: Simulation['fighters'][number]; foe: Simulation['fighters'][number] } {
  const sim = new Simulation({
    seed: 1,
    idleFallback: 0,
    teams: [[{ def: fighterById('naofumi'), controller: 'player' }], [{ def: fighterById(foe), controller: 'player' }]],
  });
  const [nao, other] = sim.fighters;
  nao.pos = { x: 300, y: 200 };
  other.pos = { x: 360, y: 200 };
  for (const f of sim.fighters) f.invuln = 0;
  return { sim, nao, foe: other };
}

const cast = (sim: Simulation, f: Simulation['fighters'][number], slot: 0 | 1 | 2 | 3 | 4): void => {
  f.energy = 100;
  f.ult = 100;
  expect(sim.tryCast(f, slot)).toBeNull();
  for (let i = 0; i < 90 && f.casting; i++) sim.step();
};

describe('Naofumi reflection', () => {
  it('Air Strike Shield throws half of the absorbed damage back at the attacker', () => {
    const { sim, nao, foe } = bout();
    cast(sim, nao, 0);
    expect(nao.statuses.some((s) => s.type === 'shield' && s.reflect === 0.5)).toBe(true);
    const events: SimEvent[] = [];
    const hpFoe = foe.hp;
    const hpNao = nao.hp;
    sim.applyEffects(foe, nao, [{ type: 'damage', amount: 30 }], HIT, foe.pos);
    events.push(...sim.drainEvents());
    expect(nao.hp).toBe(hpNao);
    expect(hpFoe - foe.hp).toBeGreaterThan(12);
    expect(hpFoe - foe.hp).toBeLessThanOrEqual(30);
    expect(events.some((e) => e.type === 'reflect' && e.to === foe.uid)).toBe(true);
  });

  it('only the absorbed part is reflected when a hit breaks the shield', () => {
    const { sim, nao, foe } = bout();
    nao.statuses = [{ type: 'shield', remaining: 5, value: 10, source: nao.uid, reflect: 1, cap: 100 }];
    const hpFoe = foe.hp;
    sim.applyEffects(foe, nao, [{ type: 'damage', amount: 50, }], HIT, foe.pos);
    // 10 absorbed (plus roll): the reflection can never exceed what the shield held.
    expect(hpFoe - foe.hp).toBeLessThanOrEqual(10);
    expect(nao.hp).toBeLessThan(nao.maxHp);
  });

  it('reflected damage never reflects again (two Naofumi cannot loop)', () => {
    const { sim, nao, foe } = bout('naofumi');
    for (const f of [nao, foe]) f.statuses = [{ type: 'shield', remaining: 5, value: 200, source: f.uid, reflect: 1, cap: 100 }];
    sim.applyEffects(foe, nao, [{ type: 'damage', amount: 40 }], HIT, foe.pos);
    const left = foe.statuses.find((s) => s.type === 'shield')!.value;
    // The foe's own barrier soaked the one reflection and threw nothing further back.
    expect(left).toBeLessThan(200);
    expect(nao.statuses.find((s) => s.type === 'shield')!.value).toBeGreaterThan(150);
  });

  it('Guardian\'s Protection shields every nearby ally, each reflecting separately', () => {
    const sim = new Simulation({
      seed: 3,
      idleFallback: 0,
      teams: [
        [{ def: fighterById('naofumi'), controller: 'player' }, { def: fighterById('sakura'), controller: 'ai' }],
        [{ def: fighterById('naruto'), controller: 'ai' }, { def: fighterById('goku'), controller: 'ai' }],
      ],
    });
    const [nao, sakura, a, b] = sim.fighters;
    for (const f of sim.fighters) f.invuln = 0;
    nao.pos = { x: 300, y: 200 };
    sakura.pos = { x: 260, y: 260 };
    a.pos = { x: 800, y: 60 };
    b.pos = { x: 800, y: 380 };
    cast(sim, nao, 3);
    expect(sakura.statuses.some((s) => s.type === 'shield' && s.reflect)).toBe(true);
    const hpA = a.hp;
    sim.applyEffects(a, sakura, [{ type: 'damage', amount: 30 }], HIT, a.pos);
    expect(a.hp).toBeLessThan(hpA);
  });
});

describe('Shield Prison', () => {
  it('roots the target and breaks when the prisoner batters it', () => {
    const { sim, nao, foe } = bout();
    cast(sim, nao, 1);
    expect(foe.hasStatus('cage')).toBe(true);
    foe.vel = { x: 100, y: 0 };
    const x = foe.pos.x;
    for (let i = 0; i < 10; i++) sim.step();
    expect(Math.abs(foe.pos.x - x)).toBeLessThan(2);
    const hp = foe.hp;
    for (let i = 0; i < 4; i++) sim.applyEffects(foe, nao, [{ type: 'damage', amount: 30 }], HIT, foe.pos);
    expect(foe.hp).toBeLessThan(hp);
    expect(foe.hasStatus('cage')).toBe(false);
  });

  it('expires by itself', () => {
    const { sim, nao, foe } = bout();
    cast(sim, nao, 1);
    for (let i = 0; i < Math.ceil(3 / DT); i++) sim.step();
    expect(foe.hasStatus('cage')).toBe(false);
  });
});

describe('Counter Stance and Retribution', () => {
  it('stores what it blocks and slams it out when the stance ends', () => {
    const { sim, nao, foe } = bout();
    cast(sim, nao, 2);
    expect(nao.hasStatus('stance')).toBe(true);
    expect(sim.tryAttack(nao)).toBe(false);
    for (let i = 0; i < 4; i++) sim.applyEffects(foe, nao, [{ type: 'damage', amount: 40 }], HIT, foe.pos);
    expect(nao.retaliation).toBeGreaterThan(20);
    foe.pos = { x: 330, y: 200 };
    const hp = foe.hp;
    for (let i = 0; i < Math.ceil(4 / DT) && nao.hasStatus('stance'); i++) sim.step();
    expect(nao.retaliation).toBe(0);
    expect(foe.hp).toBeLessThan(hp - 8);
  });

  it('an unattacked stance only releases a weak shockwave', () => {
    const { sim, nao, foe } = bout();
    cast(sim, nao, 2);
    foe.pos = { x: 330, y: 200 };
    const hp = foe.hp;
    for (let i = 0; i < Math.ceil(4 / DT) && nao.hasStatus('stance'); i++) {
      foe.attackCd = 99;
      sim.step();
    }
    expect(hp - foe.hp).toBeLessThan(15);
  });

  it('the ultimate stores reflected damage and its shockwave is capped', () => {
    const { sim, nao, foe } = bout();
    cast(sim, nao, 4);
    expect(nao.hasStatus('stance')).toBe(true);
    for (let i = 0; i < 30; i++) {
      for (const s of nao.statuses) if (s.type === 'shield') s.value = 90;
      sim.applyEffects(foe, nao, [{ type: 'damage', amount: 60 }], HIT, foe.pos);
    }
    expect(nao.retaliation).toBeGreaterThan(80);
    foe.hp = foe.maxHp;
    foe.invuln = 0;
    foe.pos = { x: 340, y: 200 };
    for (let i = 0; i < Math.ceil(6 / DT) && nao.hasStatus('stance'); i++) {
      foe.invuln = 0;
      foe.attackCd = 99;
      sim.step();
    }
    // Capped at 80 (plus roll): it never one-shots.
    expect(foe.maxHp - foe.hp).toBeLessThan(100);
  });
});

describe('Naofumi awakening', () => {
  it('shielding allies fills the meter and he stays a pure tank', () => {
    const { sim, nao, foe } = bout();
    for (let i = 0; i < 80; i++) {
      nao.statuses = [{ type: 'shield', remaining: 5, value: 500, source: nao.uid, reflect: 0.5, cap: 30 }];
      nao.hp = nao.maxHp;
      for (let k = 0; k < 20; k++) sim.step();
      sim.applyEffects(foe, nao, [{ type: 'damage', amount: 30 }], HIT, foe.pos);
    }
    expect(nao.passive.meter).toBeGreaterThan(15);
    nao.passive.meter = 100;
    nao.energy = 100;
    expect(sim.tryTransform(nao)).toBe(true);
    expect(nao.skill(0).id).toBe('naofumi.airstrike.awakened');
    expect(nao.form?.damageMult).toBe(1);
  });
});
