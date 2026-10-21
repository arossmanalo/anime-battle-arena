import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { fighterById } from '../../data/fighters';
import { newSeed, type MatchResult } from '../../game/match';
import { Button, Portrait, Sprite } from '../components/kit';
import { hexColor } from '../info';
import { awards, contributions, fmtTime, labels, sorted, teamTotals, type Breakdown, type ResultFighter } from '../resultStats';
import { useStore } from '../store';

const n0 = (n: number): string => String(Math.round(n));
const n1 = (n: number): string => (Math.round(n * 10) / 10).toString();

/** A two-sided bar: your side on the left, the opponent on the right. */
function VersusRow({ label, a, b, fmt = n0, hint }: { label: string; a: number; b: number; fmt?: (n: number) => string; hint?: string }) {
  const total = a + b;
  const left = total > 0 ? (a / total) * 100 : 50;
  return (
    <div className="tot-row" title={hint}>
      <span className="tot-num">{fmt(a)}</span>
      <div className="tot-mid">
        <span className="tot-label">{label}</span>
        <div className="tot-bar">
          <i className="mine" style={{ width: `${left}%` }} />
          <i className="theirs" style={{ width: `${100 - left}%` }} />
        </div>
      </div>
      <span className="tot-num right">{fmt(b)}</span>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stat" title={hint}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Bars({ title, rows, color, unit = '' }: { title: string; rows: Breakdown[]; color: string; unit?: string }) {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="breakdown">
      <h5>{title}</h5>
      {rows.slice(0, 7).map((r) => (
        <div key={r.label} className="brow">
          <span className="bname">{r.label}</span>
          <span className="btrack">
            <i style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </span>
          <span className="bval">
            {n0(r.value)}
            {unit} <em>{Math.round((r.value / total) * 100)}%</em>
          </span>
        </div>
      ))}
    </div>
  );
}

function FighterReport({
  f,
  duration,
  names,
  share,
  open,
  toggle,
}: {
  f: ResultFighter;
  duration: number;
  names: Map<number, string>;
  share: ReturnType<typeof contributions> extends Map<number, infer C> ? C : never;
  open: boolean;
  toggle: () => void;
}) {
  const def = fighterById(f.id);
  const s = f.stats;
  const color = hexColor(def.color);
  const frac = Math.max(0, f.hpLeft / f.maxHp);
  const alive = s.diedAt === null;
  const lived = s.diedAt ?? duration;
  const dps = lived > 0 ? s.damageDealt / lived : 0;
  const perHit = s.hits ? s.damageDealt / s.hits : 0;
  const nameOf = (uid: string): string => names.get(Number(uid)) ?? 'Unknown';
  const prevented = s.damageBlocked + s.damageMitigated;
  return (
    <div className={`fr ${open ? 'open' : ''}`} style={{ ['--accent' as string]: color }}>
      <button className="fr-head" onClick={toggle} aria-expanded={open}>
        <Portrait def={def} size={52} />
        <span className="fr-id">
          <span className="fr-name">
            {names.get(f.uid)}
            {f.transformed && <span className="tag small">Awakened{s.transformedAt !== null ? ` at ${fmtTime(s.transformedAt)}` : ''}</span>}
            <span className={alive ? 'alive' : 'ko'}>{alive ? 'survived' : `KO at ${fmtTime(s.diedAt ?? 0)}`}</span>
          </span>
          <span className="bar">
            <i style={{ width: `${frac * 100}%`, background: frac > 0.5 ? 'var(--hp)' : frac > 0.25 ? 'var(--hp-mid)' : 'var(--hp-low)' }} />
          </span>
          <span className="fr-line">
            HP {f.hpLeft}/{f.maxHp} · {n0(s.damageDealt)} dealt · {n0(s.damageTaken)} taken
            {s.healingDone > 0 ? ` · ${n0(s.healingDone)} healed` : ''}
            {s.kills > 0 ? ` · ${s.kills} KO` : ''}
          </span>
        </span>
        <span className="fr-score" title="Share of the team's total work: damage, tanking and support combined">
          <b>{Math.round(share.score * 100)}%</b>
          <small>of the team</small>
        </span>
        <span className="fr-chev" aria-hidden>
          {open ? 'Hide' : 'Details'}
        </span>
      </button>

      <div className="jobs" title="Damage dealt, damage taken or turned aside, and support given: this fighter's share of each, within their team">
        <span className="job off" style={{ ['--w' as string]: `${share.shares.offense * 100}%` }}>
          <i />
          <em>Damage {Math.round(share.shares.offense * 100)}%</em>
        </span>
        <span className="job def" style={{ ['--w' as string]: `${share.shares.defence * 100}%` }}>
          <i />
          <em>Tanking {Math.round(share.shares.defence * 100)}%</em>
        </span>
        <span className="job sup" style={{ ['--w' as string]: `${share.shares.support * 100}%` }}>
          <i />
          <em>Support {Math.round(share.shares.support * 100)}%</em>
        </span>
      </div>

      {open && (
        <div className="fr-body">
          <div className="fr-grid">
            <dl className="stats-group">
              <h5>Offense</h5>
              <Stat label="Damage dealt" value={n0(s.damageDealt)} />
              <Stat label="Damage per second" value={n1(dps)} hint="Over the time this fighter was alive" />
              <Stat label="Hits landed" value={String(s.hits)} />
              <Stat label="Average hit" value={n1(perHit)} />
              <Stat label="Biggest hit" value={n0(s.biggestHit)} />
              <Stat label="Knockouts" value={String(s.kills)} hint="The last hit on an enemy" />
              <Stat label="Assists" value={String(s.assists)} hint="Dealt at least 12% of the enemy's health before it fell" />
              <Stat label="Reflected damage" value={n0(s.reflected)} hint="Already counted in damage dealt" />
            </dl>
            <dl className="stats-group">
              <h5>Defence</h5>
              <Stat label="Damage taken" value={n0(s.damageTaken)} />
              <Stat label="Soaked by own shields" value={n0(s.damageBlocked)} />
              <Stat label="Shaved off by guards" value={n0(s.damageMitigated)} hint="Damage resistance, guards and stances" />
              <Stat label="Total prevented" value={n0(prevented)} />
              <Stat label="Attacks avoided" value={String(s.attacksAvoided)} hint="Blocked or evaded by a passive" />
              <Stat label="Healing received" value={n0(s.healingReceived)} />
              <Stat label="Time alive" value={alive ? `${fmtTime(duration)} (whole match)` : fmtTime(lived)} />
              <Stat label="Health left" value={`${Math.round(frac * 100)}%`} />
            </dl>
            <dl className="stats-group">
              <h5>Support</h5>
              <Stat label="Healing done" value={n0(s.healingDone)} />
              <Stat label="Shield given" value={n0(s.shieldGiven)} hint="Total shield health handed out, to anyone" />
              <Stat label="Soaked for others" value={n0(s.damageProtected)} hint="Damage absorbed by shields this fighter put on teammates" />
              <Stat label="Control time" value={`${n1(s.controlTime)}s`} hint="Stun, slow and cage seconds put on enemies" />
            </dl>
            <dl className="stats-group">
              <h5>Activity</h5>
              <Stat label="Skills used" value={String(s.skillsUsed)} />
              <Stat label="Ultimates" value={String(s.ultsUsed)} />
              <Stat label="Skills per minute" value={n1(lived > 0 ? (s.skillsUsed / lived) * 60 : 0)} />
              <Stat label="Awakened" value={s.transformedAt === null ? 'never' : fmtTime(s.transformedAt)} />
            </dl>
          </div>
          <div className="fr-breakdowns">
            <Bars title="Damage by skill" rows={sorted(s.bySkill)} color={color} />
            <Bars title="Damage dealt to" rows={sorted(s.dealtTo, nameOf)} color={color} />
            <Bars title="Damage taken from" rows={sorted(s.takenFrom, nameOf)} color="var(--red)" />
          </div>
        </div>
      )}
    </div>
  );
}

export function Results() {
  const { result, setSetup, backTo } = useStore();
  const nav = useNavigate();
  const [open, setOpen] = useState<Set<number>>(new Set());
  const view = useMemo(() => {
    if (!result) return undefined;
    return { share: contributions(result.fighters), names: labels(result.fighters), prizes: awards(result.fighters, result.winnerTeam) };
  }, [result]);
  if (!result || !view) return <Navigate to="/play" replace />;

  const won = result.winnerTeam === 0;
  const draw = result.winnerTeam === -1;
  const headline = draw ? 'DRAW' : won ? 'VICTORY' : 'DEFEAT';
  const color = draw ? 'var(--bg-text)' : won ? 'var(--yellow)' : 'var(--red)';
  const teams = [0, 1];
  const sides = teams.map((t) => result.fighters.filter((f, i) => (f.team ?? i) === t));
  const totals = sides.map(teamTotals);
  const everyone = result.fighters;
  // Win screen: the winning side's top damage dealer strikes a pose and says a win line.
  const star = draw ? undefined : sides[result.winnerTeam]?.slice().sort((a, b) => b.damageDealt - a.damageDealt)[0];
  const starDef = star ? fighterById(star.id) : undefined;
  const winLines = starDef?.voiceLines.win ?? [];
  const winLine = winLines.length ? winLines[Math.floor(result.duration * 10) % winLines.length] : undefined;
  const allOpen = open.size === everyone.length;
  const toggle = (uid: number): void =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(uid)) next.add(uid);
      return next;
    });

  return (
    <div className="page results">
      <h1 className="result-title" style={{ color }}>
        {headline}
      </h1>
      <p className="lede center-text">
        {result.reason === 'ko' ? 'Knockout' : 'Time out'} after {fmtTime(result.duration)} ({result.duration.toFixed(1)} seconds)
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

      <section className="rs-section">
        <h2>Match totals</h2>
        <div className="card tot">
          <div className="tot-head">
            <span>Your side</span>
            <span>Opponent</span>
          </div>
          <VersusRow label="Damage dealt" a={totals[0].damage} b={totals[1].damage} />
          <VersusRow label="Damage taken" a={totals[0].taken} b={totals[1].taken} />
          <VersusRow label="Damage prevented" a={totals[0].prevented} b={totals[1].prevented} hint="Soaked by shields plus shaved off by guards and resistances" />
          <VersusRow label="Reflected" a={totals[0].reflected} b={totals[1].reflected} hint="Damage thrown back by barriers and cages" />
          <VersusRow label="Healing" a={totals[0].healing} b={totals[1].healing} />
          <VersusRow label="Shield given" a={totals[0].shields} b={totals[1].shields} />
          <VersusRow label="Control time (s)" a={totals[0].control} b={totals[1].control} fmt={n1} hint="Stun, slow and cage seconds put on enemies" />
          <VersusRow label="Knockouts" a={totals[0].kills} b={totals[1].kills} />
          <VersusRow label="Hits landed" a={totals[0].hits} b={totals[1].hits} />
          <VersusRow label="Ultimates" a={totals[0].ults} b={totals[1].ults} />
        </div>
      </section>

      {everyone.length > 2 && view.prizes.length > 0 && (
        <section className="rs-section">
          <h2>Highlights</h2>
          <div className="awards">
            {view.prizes.map((a) => {
              const def = fighterById(a.fighter.id);
              return (
                <div key={a.key} className={`award ${a.key}`} style={{ ['--accent' as string]: hexColor(def.color) }}>
                  <span className="award-title">{a.title}</span>
                  <Portrait def={def} size={44} />
                  <b>{view.names.get(a.fighter.uid)}</b>
                  <span className="award-val">{a.value}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="rs-section">
        <div className="rs-title">
          <h2>Every fighter</h2>
          <Button variant="plain" onClick={() => setOpen(allOpen ? new Set() : new Set(everyone.map((f) => f.uid)))}>
            {allOpen ? 'Collapse all' : 'Expand all'}
          </Button>
        </div>
        <div className="result-teams">
          {teams.map((t) => {
            const winner = t === result.winnerTeam;
            const rows = sides[t].slice().sort((a, b) => (view.share.get(b.uid)?.score ?? 0) - (view.share.get(a.uid)?.score ?? 0));
            return (
              <div key={t} className={`card result-team ${winner ? 'winner' : ''}`}>
                <h3>
                  {t === 0 ? 'Your side' : 'Opponent'}
                  {winner && <span className="badge">Winner</span>}
                </h3>
                {rows.map((f) => (
                  <FighterReport
                    key={f.uid}
                    f={f}
                    duration={result.duration}
                    names={view.names}
                    share={view.share.get(f.uid)!}
                    open={open.has(f.uid)}
                    toggle={() => toggle(f.uid)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </section>

      <div className="hero-actions center">
        <Button
          onClick={() => {
            setSetup({ ...(result as MatchResult).setup, seed: newSeed() });
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
