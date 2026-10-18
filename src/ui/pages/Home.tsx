import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROSTER } from '../../data/fighters';
import { Button, Sprite } from '../components/kit';
import { hexColor } from '../info';

/** The roster as a lineup: slab height follows health, so the tankiest fighters stand tallest. */
function Lineup() {
  const [hot, setHot] = useState<string | null>(null);
  const hp = ROSTER.map((d) => d.hp);
  const lo = Math.min(...hp);
  const hi = Math.max(...hp);
  return (
    <div className="lineup" role="list">
      {ROSTER.map((d, i) => {
        const h = 190 + ((d.hp - lo) / Math.max(1, hi - lo)) * 90;
        return (
          <Link
            key={d.id}
            to={`/roster/${d.id}`}
            role="listitem"
            className={`slab ${hot === d.id ? 'hot' : ''}`}
            style={{ ['--c' as string]: hexColor(d.color), ['--h' as string]: `${h}px`, ['--i' as string]: i }}
            onMouseEnter={() => setHot(d.id)}
            onMouseLeave={() => setHot(null)}
            onFocus={() => setHot(d.id)}
            onBlur={() => setHot(null)}
            aria-label={`${d.name}, ${d.series}`}
          >
            <span className="slab-sprite">
              <Sprite def={d} size={132} anim={hot === d.id ? 'cast' : 'idle'} />
            </span>
            <span className="slab-name">{d.name}</span>
          </Link>
        );
      })}
    </div>
  );
}

const MODES = [
  { to: '/duel', title: 'Duel', body: 'You and one CPU opponent. Every skill, the ultimate and the awakening are on your keys.', cls: 'red' },
  { to: '/team', title: 'Team battle', body: 'Draft two to four fighters a side, set who stands in front, then call the orders.', cls: 'yellow' },
  { to: '/training', title: 'Training', body: 'A dummy, infinite energy and a damage meter. Find out what a move really does.', cls: 'mint' },
];

export function Home() {
  return (
    <div className="home">
      <section className="hero">
        <h1 className="hero-title">
          Twelve fighters.
          <br />
          One arena.
        </h1>
        <p className="hero-sub">Pick who walks out, win with their awakening, and keep a tank in front of your healer.</p>
        <div className="hero-actions">
          <Button to="/play">Play</Button>
          <Button to="/roster" variant="plain">
            See the roster
          </Button>
        </div>
      </section>

      <Lineup />

      <section className="modes">
        {MODES.map((m) => (
          <Link key={m.to} to={m.to} className={`mode-panel ${m.cls}`}>
            <h2>{m.title}</h2>
            <p>{m.body}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
