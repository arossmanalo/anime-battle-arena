import { Navigate, useNavigate } from 'react-router-dom';
import { fighterById } from '../../data/fighters';
import { newSeed } from '../../game/match';
import { Button, Portrait, Sprite } from '../components/kit';
import { hexColor } from '../info';
import { useStore } from '../store';

export function Results() {
  const { result, setSetup, backTo } = useStore();
  const nav = useNavigate();
  if (!result) return <Navigate to="/play" replace />;

  const won = result.winnerTeam === 0;
  const draw = result.winnerTeam === -1;
  const headline = draw ? 'DRAW' : won ? 'VICTORY' : 'DEFEAT';
  const color = draw ? 'var(--bg-text)' : won ? 'var(--yellow)' : 'var(--red)';
  const maxDmg = Math.max(1, ...result.fighters.map((f) => f.damageDealt));
  const teams = [0, 1];
  // Win screen: the winning side's top damage dealer strikes a pose and says a win line.
  const star = draw ? undefined : result.fighters.filter((f, i) => (f.team ?? i) === result.winnerTeam).sort((a, b) => b.damageDealt - a.damageDealt)[0];
  const starDef = star ? fighterById(star.id) : undefined;
  const winLines = starDef?.voiceLines.win ?? [];
  const winLine = winLines.length ? winLines[Math.floor(result.duration * 10) % winLines.length] : undefined;

  return (
    <div className="page results">
      <h1 className="result-title" style={{ color }}>
        {headline}
      </h1>
      <p className="lede center-text">
        {result.reason === 'ko' ? 'Knockout' : 'Time out'} after {result.duration.toFixed(1)} seconds
      </p>

      {star && starDef && (
        <section className="win-quote" style={{ ['--accent' as string]: hexColor(starDef.color) }}>
          <div className="win-stage">
            <Sprite def={starDef} form={star.transformed} anim="cast" size={220} />
          </div>
          <div className="win-text">
            <span className="win-label">{won ? 'Your winner' : 'Winner'}</span>
            <h2>{star.name}</h2>
            {winLine && <p className="win-line">“{winLine}”</p>}
          </div>
        </section>
      )}

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
                      <div className="bar"><i style={{ width: `${frac * 100}%`, background: frac > 0.5 ? 'var(--hp)' : frac > 0.25 ? 'var(--hp-mid)' : 'var(--hp-low)' }} /></div>
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
