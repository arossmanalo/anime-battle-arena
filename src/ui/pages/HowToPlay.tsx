import { AnimatePresence, motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { PageHeader } from '../components/kit';

const CONTROLS: [string, string][] = [
  ['1 2 3 4', 'Cast skill 1 to 4'],
  ['U', 'Ultimate (when the meter is full)'],
  ['T', 'Transform, when the fighter has a manual form and meets its condition'],
  ['A', 'Toggle AUTO: let the AI play for you'],
  ['M', 'Mute / unmute'],
  ['ESC', 'Pause. Press Q while paused to leave the match'],
];
const TEAM_KEYS: [string, string][] = [
  ['Click an enemy card', 'FOCUS: the whole team attacks that fighter'],
  ['Click an ally card', 'PROTECT: supports favour them, tanks guard them'],
  ['1 / 2 / 3', 'Stance: aggressive, balanced, defensive'],
  ['H', 'Hold ultimates: the AI stops using them, you fire them with U on a card'],
  ['X', 'Clear focus and protect orders'],
  ['S', 'Game speed 1x / 2x / 0.5x'],
];
const TRAINING_KEYS: [string, string][] = [
  ['R', 'Reset the field and stats'],
  ['C', 'Toggle cooldowns'],
  ['D', 'Dummy: still, pacing, strafing, attacking'],
  ['T', 'Turn the form on or off'],
];

function Keys({ rows }: { rows: [string, string][] }) {
  return (
    <table className="keys">
      <tbody>
        {rows.map(([k, d]) => (
          <tr key={k}>
            <td>
              {k.split(' ').length > 1 && k.length < 12 ? k.split(' ').map((x) => <kbd key={x}>{x}</kbd>) : <kbd>{k}</kbd>}
            </td>
            <td>{d}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Accordion({ title, children, open: initial = false }: { title: string; children: ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(initial);
  return (
    <div className={`acc ${open ? 'open' : ''}`}>
      <button className="acc-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{title}</span>
        <span className="acc-chev">{open ? 'Hide' : 'Show'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="acc-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
            <div className="acc-inner">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HowToPlay() {
  return (
    <div className="page narrow">
      <PageHeader title="How to play">Everything you need to win your first match, and the systems behind it.</PageHeader>
      <Accordion title="The goal" open>
        <p>Knock out the other team before the clock runs out. If time expires, the side with more health left wins. Duels last 99 seconds; team battles last 150, and in team battles healing weakens and defences drop the longer the fight goes, so stalling never works.</p>
      </Accordion>
      <Accordion title="Controls in a duel" open>
        <Keys rows={CONTROLS} />
        <p className="muted">Basic attacks happen automatically when an enemy is in reach. If you stop casting for a few seconds, the AI casts for you until you press a key again.</p>
      </Accordion>
      <Accordion title="Energy, cooldowns and the ultimate">
        <p>Each skill costs energy and has a cooldown. Energy regenerates over time and also fills when you deal or take damage. The ultimate has no energy cost: its meter fills from damage and over time, and you fire it with U when it reads READY.</p>
      </Accordion>
      <Accordion title="Awakening and forms">
        <p>Every fighter has a permanent awakening that replaces some or all of their kit. Most unlock below a HP threshold. Others fill a meter (rage, morale, strategy), and some are a second life that triggers when the fighter would die. The roster page shows each form's skills.</p>
      </Accordion>
      <Accordion title="Team battles and roles">
        <p>Each fighter is a tank, damage dealer or support (or a mix). Tanks hold the front line and draw fire, supports heal, shield and buff, damage fighters kill. A good team covers all three. The draft screen shows the balance of each side.</p>
        <p>You do not control fighters in a team battle. You set the formation (front or back line) and give orders:</p>
        <Keys rows={TEAM_KEYS} />
      </Accordion>
      <Accordion title="Training mode">
        <p>A target dummy, infinite energy and a full ultimate meter. Use it to read what a skill really does.</p>
        <Keys rows={TRAINING_KEYS} />
      </Accordion>
      <Accordion title="Tips">
        <ul className="plain">
          <li>Fight at the range your fighter prefers: zoners keep their distance, rushdown fighters close in.</li>
          <li>Save the ultimate for when an enemy is stunned or cornered.</li>
          <li>In team battles, focus the support first, or protect your own.</li>
          <li>Read each fighter's passive on the roster page: a barrier, a dodge and a rage meter all change how you should play.</li>
        </ul>
      </Accordion>
    </div>
  );
}
