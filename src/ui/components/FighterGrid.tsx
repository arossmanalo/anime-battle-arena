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
  disabled = [],
  badge,
  columns,
}: {
  onPick: (def: FighterDef) => void;
  selected?: string[];
  disabled?: string[];
  badge?: (def: FighterDef) => ReactNode;
  columns?: number;
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
      <div className="picker-grid" style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>
        {list.map((d) => {
          const off = disabled.includes(d.id);
          const on = selected.includes(d.id);
          return (
            <button key={d.id} className={`tile ${on ? 'selected' : ''} ${off ? 'off' : ''}`} style={{ ['--accent' as string]: hexColor(d.color) }} disabled={off} onClick={() => onPick(d)} title={`${d.name}, ${d.series}`}>
              <Portrait def={d} size={56} />
              <span className="tile-name">{d.name}</span>
              <span className="tile-role" style={{ color: ROLE_META[mainRoleOf(d)].color }}>
                {ROLE_META[mainRoleOf(d)].label}
              </span>
              {badge?.(d)}
            </button>
          );
        })}
        {!list.length && <div className="empty">No fighter matches that search.</div>}
      </div>
    </div>
  );
}

/** Big preview of a chosen fighter (sprite, name, role). `side` flips the sprite to face the other way. */
export function FighterPreview({ def, label, side = 'left', empty = 'Pick a fighter', active, onClick, extra }: { def?: FighterDef; label: string; side?: 'left' | 'right'; empty?: string; active?: boolean; onClick?: () => void; extra?: ReactNode }) {
  const accent = def ? hexColor(def.color) : 'var(--paper-2)';
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
        </div>
      )}
      {extra}
    </div>
  );
}
