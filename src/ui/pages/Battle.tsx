import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { startBattle, type BattleHost } from '../phaserHost';
import { Button } from '../components/kit';
import { VersusSplash } from '../components/VersusSplash';
import { useStore } from '../store';

export function Battle() {
  const { setup, setResult, backTo } = useStore();
  const nav = useNavigate();
  const holder = useRef<HTMLDivElement>(null);
  const host = useRef<BattleHost | null>(null);
  const [ready, setReady] = useState(false);
  // Duels and team battles open on the versus splash; the game loads once it has played.
  const [versus, setVersus] = useState(() => !!setup && !setup.training);

  useEffect(() => {
    if (!setup || versus || !holder.current) return;
    const h = startBattle(holder.current, setup, {
      ready: () => setReady(true),
      result: (r) => {
        setResult(r);
        nav('/results');
      },
      quit: () => nav(backTo),
    });
    host.current = h;
    return () => {
      h.destroy();
      host.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup, versus]);

  if (!setup) return <Navigate to="/play" replace />;
  return (
    <div className="battle-page">
      {versus && <VersusSplash setup={setup} onDone={() => setVersus(false)} />}
      <div className="battle-bar">
        <span className="battle-title">{setup.training ? 'Training' : setup.team ? `${setup.team.size}v${setup.team.size} team battle` : 'Duel'}</span>
        <span className="grow" />
        <Button variant="plain" onClick={() => host.current?.pause()}>
          Pause
        </Button>
        <Button variant="danger" onClick={() => host.current?.quit()}>
          Quit
        </Button>
      </div>
      <div className="battle-stage" ref={holder}>
        {!ready && (
          <div className="loading">
            <div className="spinner" />
            <div>Loading the arena…</div>
          </div>
        )}
      </div>
    </div>
  );
}
