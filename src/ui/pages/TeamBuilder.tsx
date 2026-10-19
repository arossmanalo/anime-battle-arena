import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROSTER, fighterById } from '../../data/fighters';
import { newSeed, type TeamSetup } from '../../game/match';
import { draftOrder, fillTeam, maxDraftSize, pickForTeam, teamCoverage, type TeamSize } from '../../sim/draft';
import { roleScores } from '../../sim/roles';
import type { FighterDef } from '../../sim/types';
import { FighterGrid } from '../components/FighterGrid';
import { Button, PageHeader, Sprite } from '../components/kit';
import { ROLE_META, hexColor } from '../info';
import { useStore } from '../store';

interface Slot {
  id: string;
  row: 'front' | 'back';
}

const defaultRow = (d: FighterDef): 'front' | 'back' => {
  const r = roleScores(d);
  return r.support > r.tank + r.damage * 0.6 ? 'back' : 'front';
};
const toSlot = (d: FighterDef): Slot => ({ id: d.id, row: defaultRow(d) });

function TeamColumn({
  title,
  slots,
  size,
  active,
  onActivate,
  onRemove,
  onRow,
  accent,
  note,
}: {
  title: string;
  slots: Slot[];
  size: number;
  active: boolean;
  onActivate?: () => void;
  onRemove?: (i: number) => void;
  onRow?: (i: number) => void;
  accent: string;
  note?: string;
}) {
  const defs = slots.map((s) => fighterById(s.id));
  const roles = (['tank', 'damage', 'support'] as const).map((r) => ({ r, v: defs.reduce((n, d) => n + roleScores(d)[r], 0) }));
  return (
    <div className={`team ${active ? 'active' : ''}`} style={{ ['--accent' as string]: accent }} onClick={onActivate}>
      <div className="team-head">
        <h3>{title}</h3>
        <span className="team-count">{slots.length}/{size}</span>
      </div>
      <div className="team-slots">
        {Array.from({ length: size }, (_, i) => {
          const s = slots[i];
          const d = s ? fighterById(s.id) : undefined;
          return (
            <div key={i} className={`slot ${d ? 'filled' : ''}`} style={d ? { ['--accent' as string]: hexColor(d.color) } : undefined}>
              {d ? (
                <>
                  <Sprite def={d} size={86} />
                  <div className="slot-name">{d.name}</div>
                  <div className="slot-row">
                    {onRow ? (
                      <button className="mini-btn" onClick={(e) => { e.stopPropagation(); onRow(i); }} title="Switch front / back line">
                        {s.row === 'front' ? 'Front line' : 'Back line'}
                      </button>
                    ) : (
                      <span className="mini-btn static">{s.row === 'front' ? 'Front line' : 'Back line'}</span>
                    )}
                  </div>
                  {onRemove && (
                    <button className="slot-x" onClick={(e) => { e.stopPropagation(); onRemove(i); }} aria-label={`Remove ${d.name}`}>
                      ×
                    </button>
                  )}
                </>
              ) : (
                <span className="slot-empty">Empty</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="role-bars">
        {roles.map(({ r, v }) => (
          <div key={r} className="role-bar" title={ROLE_META[r].label}>
            <span style={{ color: ROLE_META[r].color }}>{ROLE_META[r].label}</span>
            <div className="role-track"><i style={{ width: `${Math.min(100, v * 60)}%`, background: ROLE_META[r].color }} /></div>
          </div>
        ))}
      </div>
      {note && <div className="team-note">{note}</div>}
    </div>
  );
}

export function TeamBuilder() {
  const nav = useNavigate();
  const { setSetup, setBackTo } = useStore();
  const [size, setSize] = useState<TeamSize>(3);
  const [mode, setMode] = useState<'free' | 'draft'>('free');
  const [mine, setMine] = useState<Slot[]>([]);
  const [cpu, setCpu] = useState<Slot[]>([]);
  const [side, setSide] = useState<'mine' | 'cpu'>('mine');
  const [turn, setTurn] = useState(0);
  const [thinking, setThinking] = useState(false);
  const timer = useRef<number>();

  const taken = useMemo(() => new Set([...mine, ...cpu].map((s) => s.id)), [mine, cpu]);
  const maxSize = Math.min(4, maxDraftSize(ROSTER.length)) as TeamSize;
  const order = useMemo(() => draftOrder(size), [size]);
  const draftDone = turn >= order.length;
  const myTurn = mode === 'draft' && !draftDone && order[turn] && !thinking;

  const reset = (nextSize = size, nextMode = mode) => {
    window.clearTimeout(timer.current);
    setMine([]);
    setCpu([]);
    setTurn(0);
    setThinking(false);
    setSide('mine');
    if (nextMode === 'draft' && !draftOrder(nextSize)[0]) setThinking(true);
  };

  // The CPU drafts whenever it is its turn.
  useEffect(() => {
    if (mode !== 'draft' || draftDone || order[turn]) return;
    setThinking(true);
    timer.current = window.setTimeout(() => {
      const pool = ROSTER;
      const pick = pickForTeam(cpu.map((s) => fighterById(s.id)), pool, size, Math.random, taken);
      if (pick) setCpu((c) => [...c, toSlot(pick)]);
      setTurn((t) => t + 1);
      setThinking(false);
    }, 750);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, turn, draftDone]);

  const onPick = (d: FighterDef) => {
    if (taken.has(d.id)) return;
    if (mode === 'draft') {
      if (!myTurn) return;
      setMine((m) => [...m, toSlot(d)]);
      setTurn((t) => t + 1);
      return;
    }
    const [list, set] = side === 'mine' ? [mine, setMine] : [cpu, setCpu];
    if (list.length >= size) return;
    set([...list, toSlot(d)]);
  };

  const autoFillCpu = () => {
    const keep = cpu.map((s) => fighterById(s.id));
    const team = fillTeam(keep, ROSTER, size, Math.random, new Set(mine.map((s) => s.id)));
    setCpu(team.map(toSlot));
  };
  const autoFillMe = () => {
    const team = fillTeam(mine.map((s) => fighterById(s.id)), ROSTER, size, Math.random, new Set(cpu.map((s) => s.id)));
    setMine(team.map(toSlot));
  };
  const reroll = () => {
    setCpu([]);
    window.setTimeout(() => {
      const team = fillTeam([], ROSTER, size, Math.random, new Set(mine.map((s) => s.id)));
      setCpu(team.map(toSlot));
    }, 0);
  };

  const ready = mine.length === size && cpu.length === size;
  const start = () => {
    if (!ready) return;
    const team: TeamSetup = { size, mode, player: mine, enemy: cpu };
    setBackTo('/team');
    setSetup({ playerId: mine[0].id, enemyId: cpu[0].id, difficulty: 'normal', seed: newSeed(), team });
    nav('/battle');
  };

  const flip = (set: typeof setMine) => (i: number) => set((l) => l.map((s, n) => (n === i ? { ...s, row: s.row === 'front' ? 'back' : 'front' } : s)));
  const remove = (set: typeof setMine) => (i: number) => set((l) => l.filter((_, n) => n !== i));

  const coverage = (l: Slot[]) => teamCoverage(l.map((s) => fighterById(s.id)), size);

  return (
    <div className="page">
      <PageHeader title="Build your team">The fight runs itself. Your job is the roster, the formation and the orders you give once it starts.</PageHeader>

      <div className="toolbar">
        <div className="seg" role="radiogroup" aria-label="Team size">
          {([2, 3, 4] as TeamSize[]).filter((n) => n <= maxSize).map((n) => (
            <button key={n} className={size === n ? 'on' : ''} role="radio" aria-checked={size === n} onClick={() => { setSize(n); reset(n); }}>
              {n}v{n}
            </button>
          ))}
        </div>
        <div className="seg" role="radiogroup" aria-label="Pick mode">
          <button className={mode === 'free' ? 'on' : ''} role="radio" aria-checked={mode === 'free'} onClick={() => { setMode('free'); reset(size, 'free'); }}>Free pick</button>
          <button className={mode === 'draft' ? 'on' : ''} role="radio" aria-checked={mode === 'draft'} onClick={() => { setMode('draft'); reset(size, 'draft'); }}>Snake draft</button>
        </div>
        <Button variant="plain" onClick={() => reset()}>
          Clear teams
        </Button>
        <span className="grow" />
        <Button onClick={start} disabled={!ready}>
          Start battle
        </Button>
      </div>

      {mode === 'draft' && (
        <div className="draft-bar" role="status">
          {draftDone ? 'Draft complete. Set the formation and start.' : thinking ? 'The CPU is picking…' : 'Your pick: choose a fighter below.'}
          <span className="draft-steps">
            {order.map((mineTurn, i) => (
              <i key={i} className={`${mineTurn ? 'me' : 'cpu'} ${i < turn ? 'done' : ''} ${i === turn ? 'now' : ''}`} />
            ))}
          </span>
        </div>
      )}

      <div className="teams">
        <TeamColumn title="Your team" slots={mine} size={size} active={mode === 'free' && side === 'mine'} onActivate={() => setSide('mine')} onRemove={mode === 'free' ? remove(setMine) : undefined} onRow={flip(setMine)} accent="var(--you)" note={mine.length === size ? `Balance ${coverage(mine).toFixed(1)}` : undefined} />
        <div className="vs small">VS</div>
        <TeamColumn title="CPU team" slots={cpu} size={size} active={mode === 'free' && side === 'cpu'} onActivate={() => setSide('cpu')} onRemove={mode === 'free' ? remove(setCpu) : undefined} onRow={mode === 'free' ? flip(setCpu) : undefined} accent="var(--foe)" note={cpu.length === size ? `Balance ${coverage(cpu).toFixed(1)}` : undefined} />
      </div>

      {mode === 'free' && (
        <div className="toolbar">
          <span className="muted">Adding to:</span>
          <div className="seg small">
            <button className={side === 'mine' ? 'on' : ''} onClick={() => setSide('mine')}>Your team</button>
            <button className={side === 'cpu' ? 'on' : ''} onClick={() => setSide('cpu')}>CPU team</button>
          </div>
          <Button variant="plain" onClick={autoFillMe}>Auto-fill mine</Button>
          <Button variant="plain" onClick={autoFillCpu}>Auto-fill CPU</Button>
          <Button variant="plain" onClick={reroll}>Re-roll CPU</Button>
        </div>
      )}

      <FighterGrid
        onPick={onPick}
        onRandom={() => {
          const pool = ROSTER.filter((d) => !taken.has(d.id));
          if (pool.length) onPick(pool[Math.floor(Math.random() * pool.length)]);
        }}
        disabled={[...taken, ...(mode === 'draft' && !myTurn ? ROSTER.map((d) => d.id) : [])]}
        badge={(d) => (taken.has(d.id) ? mine.some((s) => s.id === d.id) ? <span className="tile-badge you">Yours</span> : <span className="tile-badge cpu">CPU</span> : null)}
      />
      {!ready && <p className="hint">Both teams need {size} fighters before the battle can start.</p>}
    </div>
  );
}
