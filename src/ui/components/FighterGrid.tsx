import { useMemo, useState, type ReactNode } from 'react';
import { ROSTER } from '../../data/fighters';
import type { FighterDef, Role } from '../../sim/types';
import { ROLE_META, hexColor, mainRoleOf } from '../info';
import { Portrait, Sprite, Tag } from './kit';

export function RoleFilter({ value, onChange }: { value: Role | 'all'; onChange: (r: Role | 'all') => void }) {
  const opts: (Role | 'all')[] = ['all', 'tank', 'damage', 'support'];
  return (
    <div className="seg" role="tablist">
      {opts.map((o) => (
        <button key={o} className={value === o ? 'on' : ''} onClick={() => onChange(o)} role="tab" aria-selected={value === o}>
          {o === 'all' ? 'All' : ROLE_META[o].label}
        </button>
      ))}
    </div>
  );
}

/** Compact picker: a searchable, role-filterable grid of fighter tiles. */
export function FighterGrid({
  onPick,
  selected = [],
  rival = [],
  disabled = [],
  badge,
  columns,
  onHover,
  onRandom,
}: {
  onPick: (def: FighterDef) => void;
  selected?: string[];
  /** Picked for the other side: marked red instead of yellow. */
  rival?: string[];
  disabled?: string[];
  badge?: (def: FighterDef) => ReactNode;
  columns?: number;
  /** The fighter under the cursor or keyboard focus, so a preview can follow it; undefined when it leaves the grid. */
  onHover?: (def: FighterDef | undefined) => void;
  /** Adds the "?" tile that picks someone at random. */
  onRandom?: () => void;
}) {
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | 'all'>('all');
  const list = useMemo(
    () => ROSTER.filter((d) => (role === 'all' || mainRoleOf(d) === role) && (d.name + d.series).toLowerCase().includes(q.toLowerCase())),
    [q, role],
  );
  return (
    <div className="picker">
      <div className="picker-bar">
        <input className="input" placeholder="Search fighters or series" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search fighters" />
        <RoleFilter value={role} onChange={setRole} />
      </div>
      <div className="picker-grid" style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined} onMouseLeave={() => onHover?.(undefined)}>
        {list.map((d) => {
          const off = disabled.includes(d.id);
          const on = selected.includes(d.id);
          const foe = !on && rival.includes(d.id);
          return (
            <button key={d.id} className={`tile ${on ? 'selected' : ''} ${foe ? 'rival' : ''} ${off ? 'off' : ''}`} style={{ ['--accent' as string]: hexColor(d.color) }} disabled={off} onClick={() => onPick(d)} onMouseEnter={() => onHover?.(d)} onFocus={() => onHover?.(d)} onBlur={() => onHover?.(undefined)} title={`${d.name}, ${d.series}`}>
              <Portrait def={d} size={56} />
              <span className="tile-name">{d.name}</span>
              <span className="tile-role" style={{ color: ROLE_META[mainRoleOf(d)].color }}>
                {ROLE_META[mainRoleOf(d)].label}
              </span>
              {badge?.(d)}
            </button>
          );
        })}
        {onRandom && list.length > 0 && (
          <button className="tile random" onClick={onRandom} title="Pick a random fighter">
            <span className="random-mark" aria-hidden>?</span>
            <span className="tile-name">Random</span>
          </button>
        )}
        {!list.length && <div className="empty">No fighter matches that search.</div>}
      </div>
    </div>
  );
}

/** Big preview of a chosen fighter (sprite, name, role). `side` flips the sprite to face the other way. */
export function FighterPreview({ def, label, side = 'left', empty = 'Pick a fighter', active, onClick, extra, quote }: { def?: FighterDef; label: string; side?: 'left' | 'right'; empty?: string; active?: boolean; onClick?: () => void; extra?: ReactNode; quote?: boolean }) {
  const accent = def ? hexColor(def.color) : 'var(--panel-2)';
  return (
    <div className={`preview ${active ? 'active' : ''}`} style={{ ['--accent' as string]: accent }} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="preview-label">{label}</div>
      <div className="preview-stage">
        {def ? <Sprite def={def} size={200} flip={side === 'right'} /> : <div className="preview-empty">{empty}</div>}
      </div>
      {def && (
        <div className="preview-info">
          <div className="preview-name">{def.name}</div>
          <div className="preview-series">{def.series}</div>
          <Tag label={ROLE_META[mainRoleOf(def)].label} color={ROLE_META[mainRoleOf(def)].color} />
          {quote && def.voiceLines.intro[0] && <p className="preview-quote">“{def.voiceLines.intro[0]}”</p>}
        </div>
      )}
      {extra}
    </div>
  );
}
