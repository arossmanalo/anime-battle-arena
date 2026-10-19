import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROSTER } from '../../data/fighters';
import type { Role } from '../../sim/types';
import { RoleFilter } from '../components/FighterGrid';
import { PageHeader, Sprite, Tag } from '../components/kit';
import { AI_LABEL, ROLE_META, hexColor, mainRoleOf } from '../info';

type Sort = 'roster' | 'name' | 'hp' | 'speed';

export function Roster() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | 'all'>('all');
  const [series, setSeries] = useState('all');
  const [sort, setSort] = useState<Sort>('roster');
  const allSeries = useMemo(() => ['all', ...new Set(ROSTER.map((d) => d.series))], []);

  const list = useMemo(() => {
    const out = ROSTER.filter((d) => (role === 'all' || mainRoleOf(d) === role) && (series === 'all' || d.series === series) && (d.name + d.series).toLowerCase().includes(q.toLowerCase()));
    if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'hp') out.sort((a, b) => b.hp - a.hp);
    if (sort === 'speed') out.sort((a, b) => b.speed - a.speed);
    return out;
  }, [q, role, series, sort]);

  return (
    <div className="page">
      <PageHeader title={`${ROSTER.length} fighters`}>Every legend in the arena. Open one to see the full kit, the awakening and the numbers.</PageHeader>
      <div className="toolbar">
        <input className="input" placeholder="Search by name or series" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the roster" />
        <RoleFilter value={role} onChange={setRole} />
        <select className="input select" value={series} onChange={(e) => setSeries(e.target.value)} aria-label="Filter by series">
          {allSeries.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All series' : s}
            </option>
          ))}
        </select>
        <select className="input select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort fighters">
          <option value="roster">Roster order</option>
          <option value="name">Name</option>
          <option value="hp">Most health</option>
          <option value="speed">Fastest</option>
        </select>
      </div>
      <div className="roster-grid">
        {list.map((d) => {
          const role2 = mainRoleOf(d);
          return (
            <Link key={d.id} to={`/roster/${d.id}`} className="roster-link">
              <div className="fighter-card" style={{ ['--c' as string]: hexColor(d.color) }}>
                <div className="fighter-card-stage">
                  <Sprite def={d} size={150} />
                </div>
                <div className="fighter-card-body">
                  <div className="fighter-card-name">{d.name}</div>
                  <div className="fighter-card-series">{d.series}</div>
                  <div className="chips">
                    <Tag label={ROLE_META[role2].label} color={ROLE_META[role2].color} />
                    <Tag label={AI_LABEL[d.aiProfile]} color="var(--muted)" />
                  </div>
                  <div className="mini">
                    <span>HP {d.hp}</span>
                    <span>SPD {d.speed}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {!list.length && (
        <div className="empty big">
          No fighters match.{' '}
          <button className="linklike" onClick={() => { setQ(''); setRole('all'); setSeries('all'); }}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
