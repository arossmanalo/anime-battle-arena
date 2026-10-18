/**
 * Team balance runner: random team vs random team (AI vs AI), reporting win rates by fighter and by composition.
 *   npm run team-balance -- <team size> <matches>      (defaults: 2, 300)
 */
import { ROSTER } from '../src/data/fighters';
import { mainRole } from '../src/sim/roles';
import { Simulation } from '../src/sim/Simulation';
import { Rng } from '../src/sim/rng';
import type { FighterDef } from '../src/sim/types';

const size = Number(process.argv[2] ?? 2);
const matches = Number(process.argv[3] ?? 300);
const rng = new Rng(12345);

function randomTeam(): FighterDef[] {
  const pool = [...ROSTER];
  const team: FighterDef[] = [];
  while (team.length < size && pool.length) team.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  return team;
}

const wins = new Map<string, number>();
const games = new Map<string, number>();
const comp = new Map<string, { wins: number; games: number }>();
const pairWins = new Map<string, { wins: number; games: number }>();
let totalTime = 0;
let timeouts = 0;
let draws = 0;

const compKey = (t: FighterDef[]) => t.map((d) => mainRole(d)).sort().join('+');

for (let m = 0; m < matches; m++) {
  const a = randomTeam();
  const b = randomTeam();
  const swap = m % 2 === 1;
  const sim = new Simulation({
    seed: 7000 + m,
    teams: (swap ? [b, a] : [a, b]).map((t) => t.map((def) => ({ def, controller: 'ai' as const }))),
  });
  sim.runToEnd();
  totalTime += sim.time;
  if (sim.endReason === 'time') timeouts++;
  if (sim.winnerTeam === -1) {
    draws++;
    continue;
  }
  const aWon = (sim.winnerTeam === 0) !== swap;
  for (const [team, won] of [[a, aWon], [b, !aWon]] as [FighterDef[], boolean][]) {
    for (const def of team) {
      wins.set(def.id, (wins.get(def.id) ?? 0) + (won ? 1 : 0));
      games.set(def.id, (games.get(def.id) ?? 0) + 1);
    }
    const k = compKey(team);
    const c = comp.get(k) ?? { wins: 0, games: 0 };
    c.games++;
    if (won) c.wins++;
    comp.set(k, c);
    if (team.length === 2) {
      const pk = team.map((d) => d.id).sort().join('+');
      const p = pairWins.get(pk) ?? { wins: 0, games: 0 };
      p.games++;
      if (won) p.wins++;
      pairWins.set(pk, p);
    }
  }
}

const pct = (w: number, g: number) => (g ? ((w / g) * 100).toFixed(1) : '-').padStart(5) + '%';
console.log(`\n${size}v${size}, ${matches} matches (random teams, AI vs AI)\n`);
console.log('Fighter win rate (when on a team)');
for (const def of ROSTER) console.log(`  ${def.name.padEnd(9)} ${pct(wins.get(def.id) ?? 0, games.get(def.id) ?? 0)}  (${games.get(def.id) ?? 0} games, main role ${mainRole(def)})`);
console.log('\nComposition win rate (main roles)');
for (const [k, c] of [...comp.entries()].sort((x, y) => y[1].games - x[1].games)) console.log(`  ${k.padEnd(40)} ${pct(c.wins, c.games)}  (${c.games})`);
if (size === 2) {
  console.log('\nPairs (>= 12 games), best and worst');
  const pairs = [...pairWins.entries()].filter(([, p]) => p.games >= 12).sort((x, y) => y[1].wins / y[1].games - x[1].wins / x[1].games);
  for (const [k, p] of [...pairs.slice(0, 4), ...pairs.slice(-4)]) console.log(`  ${k.padEnd(20)} ${pct(p.wins, p.games)}  (${p.games})`);
}
console.log(`\nAverage match ${(totalTime / matches).toFixed(1)}s, timeouts ${((timeouts / matches) * 100).toFixed(1)}%, draws ${((draws / matches) * 100).toFixed(1)}%`);
