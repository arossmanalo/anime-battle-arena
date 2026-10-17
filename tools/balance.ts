/**
 * Headless balance runner: plays every AI-vs-AI pairing N times and prints win rates.
 *   npm run balance            # 200 matches per pairing
 *   npm run balance -- 1000    # custom count
 */
import { ROSTER } from '../src/data/fighters';
import { Simulation } from '../src/sim/Simulation';

const matches = Number(process.argv[2] ?? 200);
const wins = new Map<string, number>();
const games = new Map<string, number>();
const rows: string[] = [];
let totalTime = 0;
let timeouts = 0;
let played = 0;

for (let i = 0; i < ROSTER.length; i++) {
  for (let j = i + 1; j < ROSTER.length; j++) {
    const a = ROSTER[i];
    const b = ROSTER[j];
    let aWins = 0;
    let decided = 0;
    for (let m = 0; m < matches; m++) {
      // Swap sides every other match so spawn side doesn't bias results.
      const swap = m % 2 === 1;
      const sim = new Simulation({
        seed: 1000 * i + 100 * j + m + 1,
        teams: swap
          ? [[{ def: b, controller: 'ai' }], [{ def: a, controller: 'ai' }]]
          : [[{ def: a, controller: 'ai' }], [{ def: b, controller: 'ai' }]],
      });
      sim.runToEnd();
      played++;
      totalTime += sim.time;
      if (sim.endReason === 'time') timeouts++;
      if (sim.winnerTeam === -1) continue;
      decided++;
      const aWon = (sim.winnerTeam === 0) !== swap;
      if (aWon) aWins++;
    }
    const rate = decided ? aWins / decided : 0.5;
    wins.set(a.id, (wins.get(a.id) ?? 0) + aWins);
    wins.set(b.id, (wins.get(b.id) ?? 0) + decided - aWins);
    games.set(a.id, (games.get(a.id) ?? 0) + decided);
    games.set(b.id, (games.get(b.id) ?? 0) + decided);
    const flag = rate < 0.35 || rate > 0.65 ? '  <-- outside 35-65%' : '';
    rows.push(`${a.name.padEnd(8)} vs ${b.name.padEnd(8)} ${(rate * 100).toFixed(1).padStart(5)}%${flag}`);
  }
}

console.log(`\nMatchups (${matches} matches each, first fighter's win rate)\n`);
rows.forEach((r) => console.log(r));
console.log('\nOverall');
for (const f of ROSTER) {
  const rate = (wins.get(f.id) ?? 0) / Math.max(1, games.get(f.id) ?? 0);
  console.log(`${f.name.padEnd(8)} ${(rate * 100).toFixed(1).padStart(5)}%`);
}
console.log(`\nAverage match: ${(totalTime / played).toFixed(1)}s, timeouts: ${((timeouts / played) * 100).toFixed(1)}%`);
