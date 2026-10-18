import { Navigate, useNavigate } from 'react-router-dom';
import { fighterById } from '../../data/fighters';
import { newSeed } from '../../game/match';
import { Button, Portrait } from '../components/kit';
import { hexColor } from '../info';
import { useStore } from '../store';

export function Results() {
  const { result, setSetup, backTo } = useStore();
  const nav = useNavigate();
  if (!result) return <Navigate to="/play" replace />;

  const won = result.winnerTeam === 0;
  const draw = result.winnerTeam === -1;
  const headline = draw ? 'DRAW' : won ? 'VICTORY' : 'DEFEAT';
  const color = draw ? '#dfe3ff' : won ? '#ffd400' : '#ff3347';
  const maxDmg = Math.max(1, ...result.fighters.map((f) => f.damageDealt));
  const teams = [0, 1];

  return (
    <div className="page results">
      <h1 className="result-title" style={{ color }}>
        {headline}
      </h1>
      <p className="lede center-text">
        {result.reason === 'ko' ? 'Knockout' : 'Time out'} after {result.duration.toFixed(1)} seconds
      </p>

      <div className="result-teams">
        {teams.map((t) => {
          const rows = result.fighters.filter((f, i) => (f.team ?? i) === t);
          const winner = t === result.winnerTeam;
          return (
            <div key={t} className={`card result-team ${winner ? 'winner' : ''}`}>
              <h3>
                {t === 0 ? 'Your side' : 'Opponent'}
                {winner && <span className="badge">Winner</span>}
              </h3>
              {rows.map((f) => {
                const def = fighterById(f.id);
                const frac = Math.max(0, f.hpLeft / f.maxHp);
                return (
                  <div key={f.id} className="result-row" style={{ ['--accent' as string]: hexColor(def.color) }}>
                    <Portrait def={def} size={46} />
                    <div className="result-main">
                      <div className="result-name">
                        {f.name}
                        {f.transformed && <span className="tag small">Awakened</span>}
                        <span className={f.hpLeft > 0 ? 'alive' : 'ko'}>{f.hpLeft > 0 ? 'alive' : 'KO'}</span>
                      </div>
                      <div className="bar"><i style={{ width: `${frac * 100}%`, background: frac > 0.5 ? '#4dd266' : frac > 0.25 ? '#e0b73a' : '#e0503a' }} /></div>
                      <div className="result-stats">
                        <span>HP {f.hpLeft}/{f.maxHp}</span>
                        <span>Damage {f.damageDealt}</span>
                        {result.setup.team && <span>Healing {f.healing ?? 0}</span>}
                        <span>Skills {f.skillsUsed}</span>
                        <span>Hits {f.hits}</span>
                      </div>
                      <div className="bar thin"><i style={{ width: `${(f.damageDealt / maxDmg) * 100}%`, background: hexColor(def.color) }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="hero-actions center">
        <Button
          onClick={() => {
            setSetup({ ...result.setup, seed: newSeed() });
            nav('/battle');
          }}
        >
          Rematch
        </Button>
        <Button variant="plain" onClick={() => nav(backTo)}>
          Change fighters
        </Button>
        <Button variant="plain" to="/">
          Home
        </Button>
      </div>
    </div>
  );
}
