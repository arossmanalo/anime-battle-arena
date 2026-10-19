import { useEffect, useRef } from 'react';
import { fighterById } from '../../data/fighters';
import type { MatchSetup } from '../../game/match';
import type { FighterDef } from '../../sim/types';
import { hexColor } from '../info';
import { Sprite } from './kit';

const HOLD_MS = 2400;
const HOLD_REDUCED_MS = 1400;

function Side({ defs, side, label }: { defs: FighterDef[]; side: 'left' | 'right'; label: string }) {
  const lead = defs[0];
  const solo = defs.length === 1;
  return (
    <div className={`vs-side ${side}`} style={{ ['--c' as string]: hexColor(lead.color) }}>
      <div className="vs-cast">
        {defs.map((d) => (
          <Sprite key={d.id} def={d} size={solo ? 300 : 150} flip={side === 'right'} />
        ))}
      </div>
      <div className={`vs-plate ${solo ? '' : 'team'}`}>
        <span className="vs-label">{label}</span>
        <span className="vs-name">{solo ? lead.name : defs.map((d) => d.name).join(', ')}</span>
        {solo && <span className="vs-series">{lead.series}</span>}
        {solo && lead.voiceLines.intro[0] && <span className="vs-quote">“{lead.voiceLines.intro[0]}”</span>}
      </div>
    </div>
  );
}

/** The pre-fight versus splash: both sides face off, then the match loads. Any key or click skips it. */
export function VersusSplash({ setup, onDone }: { setup: MatchSetup; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(() => done.current(), reduced ? HOLD_REDUCED_MS : HOLD_MS);
    const skip = () => done.current();
    window.addEventListener('keydown', skip);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', skip);
    };
  }, []);

  const mine = setup.team ? setup.team.player.map((s) => fighterById(s.id)) : [fighterById(setup.playerId)];
  const theirs = setup.team ? setup.team.enemy.map((s) => fighterById(s.id)) : [fighterById(setup.enemyId)];
  return (
    <div className="vs-splash" onClick={() => done.current()} role="dialog" aria-label={`${mine.map((d) => d.name).join(', ')} versus ${theirs.map((d) => d.name).join(', ')}`}>
      <Side defs={mine} side="left" label={setup.team ? 'Your team' : '1P'} />
      <Side defs={theirs} side="right" label={setup.team ? 'CPU team' : 'CPU'} />
      <div className="vs-mark" aria-hidden>
        VS
      </div>
      <div className="vs-skip">Press any key to skip</div>
    </div>
  );
}
