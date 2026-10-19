import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROSTER, fighterById } from '../../data/fighters';
import { newSeed } from '../../game/match';
import type { Difficulty, FighterDef } from '../../sim/types';
import { FighterGrid, FighterPreview } from '../components/FighterGrid';
import { Button, PageHeader } from '../components/kit';
import { useStore } from '../store';

const pickRandom = (not?: string): FighterDef => {
  const pool = ROSTER.filter((d) => d.id !== not);
  return pool[Math.floor(Math.random() * pool.length)];
};

export function Duel() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { setSetup, setBackTo } = useStore();
  const first = params.get('player');
  const [player, setPlayer] = useState<FighterDef | undefined>(first && ROSTER.some((d) => d.id === first) ? fighterById(first) : undefined);
  const [enemy, setEnemy] = useState<FighterDef | undefined>();
  const [active, setActive] = useState<'player' | 'enemy'>(player ? 'enemy' : 'player');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  // The active side's portrait follows the cursor, as on an arcade select screen.
  const [hover, setHover] = useState<FighterDef | undefined>();
  const shownPlayer = active === 'player' ? hover ?? player : player;
  const shownEnemy = active === 'enemy' ? hover ?? enemy : enemy;

  const pick = (d: FighterDef) => {
    if (active === 'player') {
      setPlayer(d);
      if (!enemy) setActive('enemy');
    } else setEnemy(d);
  };
  const start = () => {
    if (!player || !enemy) return;
    setBackTo('/duel');
    setSetup({ playerId: player.id, enemyId: enemy.id, difficulty, seed: newSeed() });
    nav('/battle');
  };

  return (
    <div className="page wide">
      <PageHeader title="Choose your fighters">Click a side, then pick from the grid. The ? tile picks for you.</PageHeader>
      <div className="select-screen">
        <FighterPreview def={shownPlayer} label="1P" active={active === 'player'} onClick={() => setActive('player')} empty="Pick your fighter" quote />
        <div className="select-center">
          <FighterGrid
            onPick={pick}
            onHover={setHover}
            onRandom={() => pick(pickRandom(active === 'player' ? enemy?.id : player?.id))}
            selected={player ? [player.id] : []}
            rival={enemy ? [enemy.id] : []}
            badge={(d) => (
              <>
                {d.id === player?.id && <span className="tile-badge you">1P</span>}
                {d.id === enemy?.id && <span className={`tile-badge cpu ${d.id === player?.id ? 'left' : ''}`}>CPU</span>}
              </>
            )}
          />
          <div className="select-actions">
            <div className="seg" role="radiogroup" aria-label="CPU difficulty">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                <button key={d} className={difficulty === d ? 'on' : ''} onClick={() => setDifficulty(d)} role="radio" aria-checked={difficulty === d}>
                  {d[0].toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
            <span className="select-hint">Picking for {active === 'player' ? '1P' : 'the CPU'}</span>
          </div>
          <div className="fight-row">
            <Button onClick={start} disabled={!player || !enemy}>
              {player && enemy ? 'Fight!' : 'Pick both fighters'}
            </Button>
          </div>
        </div>
        <FighterPreview def={shownEnemy} label="CPU" side="right" active={active === 'enemy'} onClick={() => setActive('enemy')} empty="Pick the opponent" quote />
      </div>
    </div>
  );
}
