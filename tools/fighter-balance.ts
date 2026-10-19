/**
 * One fighter against everyone else (AI vs AI), for quick tuning of a new character.
 *   npx tsx tools/fighter-balance.ts <fighter id> [matches per opponent]
 */
import { fighterById, ROSTER } from '../src/data/fighters';
import { Simulation } from '../src/sim/Simulation';

const me = fighterById(process.argv[2] ?? 'naofumi');
const matches = Number(process.argv[3] ?? 100);
let wins = 0;
let games = 0;
for (const foe of ROSTER) {
  if (foe.id === me.id) continue;
  let w = 0;
  let decided = 0;
  for (let m = 0; m < matches; m++) {
    const swap = m % 2 === 1;
    const sim = new Simulation({
      seed: 500 + m,
      teams: swap ? [[{ def: foe, controller: 'ai' }], [{ def: me, controller: 'ai' }]] : [[{ def: me, controller: 'ai' }], [{ def: foe, controller: 'ai' }]],
    });
    sim.runToEnd();
    if (sim.winnerTeam === -1) continue;
    decided++;
    if ((sim.winnerTeam === 0) !== swap) w++;
  }
  wins += w;
  games += decided;
  console.log(`${me.name} vs ${foe.name.padEnd(8)} ${decided ? ((w / decided) * 100).toFixed(1) : '--'}%`);
}
console.log(`Overall ${((wins / games) * 100).toFixed(1)}%`);
