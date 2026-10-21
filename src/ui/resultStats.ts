import type { MatchResult } from '../game/match';

export type ResultFighter = MatchResult['fighters'][number];

/** The three jobs a fighter can do for a team, as raw numbers. */
export interface Jobs {
  /** Damage dealt (reflection included). */
  offense: number;
  /** Damage the fighter absorbed or turned aside: taken, soaked by own shields, shaved off by guards. */
  defence: number;
  /** What the fighter did for others: healing, shields given, damage soaked by shields they put on allies. */
  support: number;
}

export const jobsOf = (f: ResultFighter): Jobs => ({
  offense: f.stats.damageDealt,
  defence: f.stats.damageTaken + f.stats.damageBlocked + f.stats.damageMitigated,
  support: f.stats.healingDone + f.stats.shieldGiven * 0.5 + f.stats.damageProtected,
});

/** How much each job counts towards a fighter's contribution score. */
export const JOB_WEIGHT: Jobs = { offense: 0.4, defence: 0.3, support: 0.3 };

export interface Contribution {
  uid: number;
  /** Share (0-1) of the team's total in each job. */
  shares: Jobs;
  /** Weighted share across the jobs the team actually did anything in (0-1, sums to 1 over a team). */
  score: number;
}

/** Contribution of every fighter to their own team: per-job shares and one combined score. */
export function contributions(fighters: ResultFighter[]): Map<number, Contribution> {
  const out = new Map<number, Contribution>();
  const teams = [...new Set(fighters.map((f) => f.team ?? 0))];
  for (const t of teams) {
    const side = fighters.filter((f) => (f.team ?? 0) === t);
    const totals: Jobs = { offense: 0, defence: 0, support: 0 };
    for (const f of side) {
      const j = jobsOf(f);
      totals.offense += j.offense;
      totals.defence += j.defence;
      totals.support += j.support;
    }
    const active = (['offense', 'defence', 'support'] as const).filter((k) => totals[k] > 0);
    const weightSum = active.reduce((n, k) => n + JOB_WEIGHT[k], 0) || 1;
    for (const f of side) {
      const j = jobsOf(f);
      const shares: Jobs = {
        offense: totals.offense ? j.offense / totals.offense : 0,
        defence: totals.defence ? j.defence / totals.defence : 0,
        support: totals.support ? j.support / totals.support : 0,
      };
      const score = active.reduce((n, k) => n + shares[k] * JOB_WEIGHT[k], 0) / weightSum;
      out.set(f.uid, { uid: f.uid, shares, score });
    }
  }
  return out;
}

export interface TeamTotals {
  damage: number;
  taken: number;
  prevented: number;
  reflected: number;
  healing: number;
  shields: number;
  kills: number;
  control: number;
  ults: number;
  hits: number;
}

export function teamTotals(fighters: ResultFighter[]): TeamTotals {
  const t: TeamTotals = { damage: 0, taken: 0, prevented: 0, reflected: 0, healing: 0, shields: 0, kills: 0, control: 0, ults: 0, hits: 0 };
  for (const f of fighters) {
    const s = f.stats;
    t.damage += s.damageDealt;
    t.taken += s.damageTaken;
    t.prevented += s.damageBlocked + s.damageMitigated;
    t.reflected += s.reflected;
    t.healing += s.healingDone;
    t.shields += s.shieldGiven;
    t.kills += s.kills;
    t.control += s.controlTime;
    t.ults += s.ultsUsed;
    t.hits += s.hits;
  }
  return t;
}

export interface Award {
  key: string;
  title: string;
  fighter: ResultFighter;
  value: string;
}

/** Highlights of the match: the fighter that did the most of one job, if anyone did any. */
export function awards(fighters: ResultFighter[], winnerTeam: number): Award[] {
  const out: Award[] = [];
  const best = (key: string, title: string, pick: (f: ResultFighter) => number, fmt: (n: number) => string): void => {
    const sorted = [...fighters].sort((a, b) => pick(b) - pick(a));
    if (sorted.length && pick(sorted[0]) > 0) out.push({ key, title, fighter: sorted[0], value: fmt(pick(sorted[0])) });
  };
  const score = contributions(fighters);
  const pool = winnerTeam >= 0 ? fighters.filter((f) => (f.team ?? 0) === winnerTeam) : fighters;
  const mvp = [...pool].sort((a, b) => (score.get(b.uid)?.score ?? 0) - (score.get(a.uid)?.score ?? 0))[0];
  if (mvp) out.push({ key: 'mvp', title: 'MVP', fighter: mvp, value: `${Math.round((score.get(mvp.uid)?.score ?? 0) * 100)}% of the team's work` });
  best('damage', 'Most damage', (f) => f.stats.damageDealt, (n) => `${Math.round(n)} dealt`);
  best('tank', 'Toughest', (f) => f.stats.damageBlocked + f.stats.damageMitigated + f.stats.damageTaken, (n) => `${Math.round(n)} taken or turned aside`);
  best('support', 'Best support', (f) => f.stats.healingDone + f.stats.shieldGiven * 0.5 + f.stats.damageProtected, (n) => `${Math.round(n)} given or soaked for others`);
  best('kills', 'Most knockouts', (f) => f.stats.kills * 100 + f.stats.assists, (n) => `${Math.floor(n / 100)} KO`);
  best('reflect', 'Best retaliation', (f) => f.stats.reflected, (n) => `${Math.round(n)} reflected`);
  return out;
}

/** Display names for the fighters of a match; a name that appears twice (a mirror match) gets its side added. */
export function labels(fighters: ResultFighter[]): Map<number, string> {
  const out = new Map<number, string>();
  for (const f of fighters) {
    const clash = fighters.filter((o) => o.name === f.name).length > 1;
    out.set(f.uid, clash ? `${f.name} (${(f.team ?? 0) === 0 ? 'yours' : 'enemy'})` : f.name);
  }
  return out;
}

export const fmtTime = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export interface Breakdown {
  label: string;
  value: number;
}

export const sorted = (rec: Record<string, number>, name: (k: string) => string = (k) => k): Breakdown[] =>
  Object.entries(rec)
    .map(([k, v]) => ({ label: name(k), value: v }))
    .filter((b) => b.value >= 0.5)
    .sort((a, b) => b.value - a.value);
