import { Link } from 'react-router-dom';
import { fighterById } from '../../data/fighters';
import { PageHeader, Sprite } from '../components/kit';

const MODES = [
  { to: '/duel', title: 'Duel', cls: 'red', cast: ['naruto', 'sasuke'], body: 'Pick a fighter and a CPU opponent on easy, normal or hard. You press every button.', facts: ['1 against 1', 'Manual skills and ultimate', '99 second clock'] },
  { to: '/team', title: 'Team battle', cls: 'yellow', cast: ['tanjiro', 'nezuko', 'erwin'], body: 'Build a team by free pick or snake draft. The fight runs itself; you give orders.', facts: ['2v2, 3v3 or 4v4', 'Front and back line', '150 second clock'] },
  { to: '/training', title: 'Training', cls: 'mint', cast: ['goku'], body: 'Infinite energy, a dummy that hits back when you ask, and a live damage readout.', facts: ['No cooldown switch', 'Form on and off', 'No clock'] },
];

export function Play() {
  return (
    <div className="page">
      <PageHeader title="Choose a mode">Duels test your hands. Team battles test your draft and your orders. Training tests everything else.</PageHeader>
      <div className="mode-stack">
        {MODES.map((m) => (
          <Link key={m.to} to={m.to} className={`mode-row ${m.cls}`}>
            <div className="mode-title">
              <h2>{m.title}</h2>
              <div className="mode-cast" aria-hidden>
                {m.cast.map((id, i) => (
                  <Sprite key={id} def={fighterById(id)} size={72} flip={m.cast.length === 2 && i === 1} />
                ))}
              </div>
            </div>
            <p>{m.body}</p>
            <ul>
              {m.facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </Link>
        ))}
      </div>
      <p className="hint">
        New here? Read <Link to="/how-to-play">how to play</Link> or look through the <Link to="/roster">roster</Link> first.
      </p>
    </div>
  );
}
