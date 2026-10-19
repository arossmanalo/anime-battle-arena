import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROSTER, fighterById } from '../../data/fighters';
import { newSeed } from '../../game/match';
import type { FighterDef } from '../../sim/types';
import { FighterGrid, FighterPreview } from '../components/FighterGrid';
import { Button, PageHeader } from '../components/kit';
import { useStore } from '../store';

const KEYS: [string, string][] = [
  ['1-4', 'Skills'],
  ['U', 'Ultimate'],
  ['T', 'Form on / off (stands in for the second life)'],
  ['R', 'Reset field and stats'],
  ['C', 'Skills with no cooldown'],
  ['D', 'Dummy: still / pacing / strafing / attacking'],
  ['ESC', 'Pause'],
];

export function Training() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { setSetup, setBackTo } = useStore();
  const first = params.get('fighter');
  const [def, setDef] = useState<FighterDef | undefined>(first && ROSTER.some((d) => d.id === first) ? fighterById(first) : undefined);
  const [hover, setHover] = useState<FighterDef | undefined>();
  const start = () => {
    if (!def) return;
    setBackTo('/training');
    setSetup({ playerId: def.id, enemyId: 'dummy', difficulty: 'normal', seed: newSeed(), training: true });
    nav('/battle');
  };
  return (
    <div className="page">
      <PageHeader title="Pick someone to test">A target dummy, infinite energy and a full ultimate meter. Press D in the fight to make the dummy hit you back.</PageHeader>
      <div className="split">
        <FighterPreview def={hover ?? def} label="Training" empty="Pick a fighter" quote extra={<Button onClick={start} disabled={!def}>Start training</Button>} />
        <div className="card">
          <h3>Training keys</h3>
          <table className="keys">
            <tbody>
              {KEYS.map(([k, d]) => (
                <tr key={k}>
                  <td><kbd>{k}</kbd></td>
                  <td>{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <FighterGrid onPick={setDef} onHover={setHover} onRandom={() => setDef(ROSTER[Math.floor(Math.random() * ROSTER.length)])} selected={[def?.id ?? '']} />
    </div>
  );
}
