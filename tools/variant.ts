import { fighterById, ROSTER } from '../src/data/fighters';
import { Simulation } from '../src/sim/Simulation';
import type { FighterDef } from '../src/sim/types';

const base = fighterById('naofumi');
const clone = (): FighterDef => structuredClone(base);
const variants: Record<string, (d: FighterDef) => void> = {
  base: () => {},
  noReflect: (d) => {
    const strip = (s: any) => { for (const k of ['effects', 'selfEffects']) for (const e of s[k] ?? []) if (e.type === 'shield') e.reflect = 0; for (const e of s.support?.effects ?? []) if (e.type === 'shield') e.reflect = 0; };
    [...d.skills, d.ultimate].forEach(strip);
    Object.values(d.form!.skillOverrides!).forEach(strip); strip(d.form!.ultimateOverride);
  },
  noRelease: (d) => {
    const strip = (s: any) => { for (const e of s.selfEffects ?? []) if (e.type === 'stance') e.release.base = 0, e.release.perCharge = 0; };
    [...d.skills, d.ultimate].forEach(strip);
    Object.values(d.form!.skillOverrides!).forEach(strip); strip(d.form!.ultimateOverride);
  },
  noCage: (d) => { d.skills[1].effects = []; d.form!.skillOverrides![1]!.effects = []; },
  hp400: (d) => { d.hp = 400; },
  plain: (d) => {
    const strip = (s: any) => { s.effects = []; s.selfEffects = []; s.support = undefined; };
    [...d.skills, d.ultimate].forEach(strip);
    Object.values(d.form!.skillOverrides!).forEach(strip); strip(d.form!.ultimateOverride);
  },
  noPassive: (d) => { const p: any = d.passive; p.damageReduction = 0; p.knockbackResist = 0; const q: any = d.form!.passiveOverride; q.damageReduction = 0; q.knockbackResist = 0; },
  halfShield: (d) => {
    const f = (s: any) => { for (const k of ['effects', 'selfEffects']) for (const e of s[k] ?? []) if (e.type === 'shield') e.amount *= 0.5; for (const e of s.support?.effects ?? []) if (e.type === 'shield') e.amount *= 0.5; };
    [...d.skills, d.ultimate].forEach(f); Object.values(d.form!.skillOverrides!).forEach(f); f(d.form!.ultimateOverride);
  },
  noGuard: (d) => {
    const f = (s: any) => { s.selfEffects = (s.selfEffects ?? []).filter((e: any) => e.type !== 'guard' && e.type !== 'steady'); };
    [...d.skills, d.ultimate].forEach(f); Object.values(d.form!.skillOverrides!).forEach(f); f(d.form!.ultimateOverride);
  },
  noForm: (d) => { d.form = { ...d.form!, hpThreshold: -1, energyCost: 9999 }; d.passive = { ...d.passive, perTaken: 0, perSupport: 0 } as any; },
  noCurse: (d) => {
    const f = (s: any) => { for (const k of ['effects', 'selfEffects']) for (const e of s[k] ?? []) { if (e.curse) e.curse = 0; if (e.release?.burn) e.release.burn = undefined; } for (const e of s.support?.effects ?? []) if (e.curse) e.curse = 0; };
    Object.values(d.form!.skillOverrides!).forEach(f); f(d.form!.ultimateOverride);
  },
  formPassive0: (d) => { const q: any = d.form!.passiveOverride; q.damageReduction = 0; q.knockbackResist = 0; d.form!.damageTaken = 1; d.form!.knockbackTaken = 1; },
  formStatsOnly: (d) => { d.form!.skillOverrides = {}; d.form!.ultimateOverride = undefined; },
  noAttack: (d) => { d.attack.damage = 0.1; d.form!.attackOverride!.damage = 0.1; },
};
const only = process.argv.slice(2);
for (const [name, fn] of Object.entries(variants)) {
  if (only.length && !only.includes(name)) continue;
  const me = clone();
  fn(me);
  let w = 0, n = 0;
  for (const foe of ROSTER) {
    if (foe.id === 'naofumi') continue;
    for (let m = 0; m < 16; m++) {
      const swap = m % 2 === 1;
      const sim = new Simulation({ seed: 900 + m, teams: swap ? [[{ def: foe, controller: 'ai' }], [{ def: me, controller: 'ai' }]] : [[{ def: me, controller: 'ai' }], [{ def: foe, controller: 'ai' }]] });
      sim.runToEnd();
      if (sim.winnerTeam === -1) continue;
      n++;
      if ((sim.winnerTeam === 0) !== swap) w++;
    }
  }
  console.log(name.padEnd(10), ((w / n) * 100).toFixed(1) + '%', `(${n})`);
}
