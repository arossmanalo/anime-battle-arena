import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ROSTER } from '../../data/fighters';
import type { AnimName } from '../../game/assets';
import { roleScores } from '../../sim/roles';
import type { FighterDef, SkillDef } from '../../sim/types';
import { Button, Pips, Sprite, Tag } from '../components/kit';
import { AI_LABEL, ROLE_META, describeSkill, hexColor, mainRoleOf, skillMeta, statBars } from '../info';
import { skillText } from '../skillText';
import { NotFound } from './NotFound';

const ANIM_BTNS: AnimName[] = ['idle', 'run', 'cast', 'attack', 'hit', 'ko'];

function SkillCard({ fighter, slot, skill }: { fighter: string; slot: string; skill: SkillDef }) {
  const info = describeSkill(skill);
  const text = skillText(fighter, skill.name);
  return (
    <div className={`skill ${skill.ultimate ? 'ult' : ''}`} style={{ ['--accent' as string]: hexColor(skill.color) }}>
      <div className="skill-key">{slot}</div>
      <div className="skill-main">
        <div className="skill-top">
          <h4>{skill.name}</h4>
          <span className="skill-kind">{info.kindLabel}</span>
        </div>
        {text && <p className="skill-lore">{text.lore}</p>}
        {text && (
          <p className="skill-simple">
            <b>In short:</b> {text.simple}
          </p>
        )}
        <div className="skill-meta">{skillMeta(skill)}</div>
        {info.lines.length > 0 && (
          <div className="skill-line">
            <b>Hits:</b> {info.lines.join('; ')}
          </div>
        )}
        {info.allies.length > 0 && (
          <div className="skill-line ally">
            <b>Self / allies:</b> {info.allies.join('; ')}
          </div>
        )}
        {info.tags.length > 0 && (
          <div className="chips">
            {info.tags.map((t) => (
              <Tag key={t} label={t} color="#0b0d1c" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function kit(def: FighterDef, awakened: boolean, team: boolean): { slot: string; skill: SkillDef }[] {
  const form = awakened ? def.form : undefined;
  const slots = ['1', '2', '3', '4'].map((s, i) => {
    const idx = i as 0 | 1 | 2 | 3;
    const skill = form?.skillOverrides?.[idx] ?? (team ? def.teamKit?.[idx] : undefined) ?? def.skills[idx];
    return { slot: s, skill };
  });
  slots.push({ slot: 'U', skill: form?.ultimateOverride ?? def.ultimate });
  return slots;
}

export function FighterDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const def = ROSTER.find((d) => d.id === id);
  const [anim, setAnim] = useState<AnimName>('idle');
  const [awakened, setAwakened] = useState(false);
  const [team, setTeam] = useState(false);
  const [quote, setQuote] = useState(0);

  useEffect(() => {
    setAwakened(false);
    setTeam(false);
    setAnim('idle');
    window.scrollTo({ top: 0 });
  }, [id]);
  useEffect(() => {
    const t = setInterval(() => setQuote((q) => q + 1), 3500);
    return () => clearInterval(t);
  }, []);

  if (!def) return <NotFound what="fighter" />;
  const index = ROSTER.indexOf(def);
  const prev = ROSTER[(index + ROSTER.length - 1) % ROSTER.length];
  const next = ROSTER[(index + 1) % ROSTER.length];
  const accent = hexColor(def.color);
  const role = mainRoleOf(def);
  const roles = roleScores(def);
  const lines = Object.values(def.voiceLines).flat();
  const passive = awakened && def.form?.passiveOverride ? def.form.passiveOverride : def.passive;
  const attack = awakened && def.form?.attackOverride ? def.form.attackOverride : def.attack;
  const hasTeamKit = !!def.teamKit && Object.keys(def.teamKit).length > 0;

  return (
    <div className="page detail" style={{ ['--accent' as string]: accent }}>
      <div className="crumbs">
        <Link to="/roster">Back to roster</Link>
        <span className="spread" />
        <Link to={`/roster/${prev.id}`}>Previous: {prev.name}</Link>
        <Link to={`/roster/${next.id}`}>Next: {next.name}</Link>
      </div>

      <section className="detail-hero">
        <div className="detail-stage">
          <Sprite def={def} form={awakened} anim={anim} size={340} />
          <div className="seg small anim-seg" role="tablist" aria-label="Preview animation">
            {ANIM_BTNS.map((a) => (
              <button key={a} className={anim === a ? 'on' : ''} onClick={() => setAnim(a)} role="tab" aria-selected={anim === a}>
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="detail-info">
          <div className="series">{def.series}</div>
          <h1>{def.name}</h1>
          <div className="chips">
            <Tag label={ROLE_META[role].label} color={ROLE_META[role].color} />
            <Tag label={AI_LABEL[def.aiProfile]} color="#565a7e" />
            {def.form?.onDeath && <Tag label="Second life" color="#8a5a00" />}
          </div>
          <p className="quote">
            <span key={quote % lines.length}>“{lines[quote % lines.length]}”</span>
          </p>
          <div className="stats">
            {statBars(def).map((s) => (
              <Pips key={s.label} label={s.label} value={s.value} text={s.text} />
            ))}
          </div>
          <div className="role-split">
            {(['tank', 'damage', 'support'] as const).map((r) => (
              <div key={r} title={ROLE_META[r].blurb}>
                <span style={{ color: ROLE_META[r].color }}>{ROLE_META[r].label}</span>
                <div className="role-track"><i style={{ width: `${Math.round(roles[r] * 100)}%`, background: ROLE_META[r].color }} /></div>
              </div>
            ))}
          </div>
          <div className="detail-actions">
            <Button to={`/duel?player=${def.id}`}>Fight as {def.name}</Button>
            <Button to={`/training?fighter=${def.id}`} variant="plain">
              Train
            </Button>
            <Button variant="plain" onClick={() => nav('/team')}>
              Team builder
            </Button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="kit-head">
          <h2>Kit</h2>
          <div className="toggles">
            {def.form && (
              <div className="seg" role="tablist" aria-label="Form">
                <button className={!awakened ? 'on' : ''} onClick={() => setAwakened(false)}>Base</button>
                <button className={awakened ? 'on' : ''} onClick={() => setAwakened(true)}>{def.form.name}</button>
              </div>
            )}
            {hasTeamKit && !awakened && (
              <div className="seg" role="tablist" aria-label="Mode">
                <button className={!team ? 'on' : ''} onClick={() => setTeam(false)}>Duel</button>
                <button className={team ? 'on' : ''} onClick={() => setTeam(true)}>Team battle</button>
              </div>
            )}
          </div>
        </div>
        {awakened && def.form && (
          <p className="note">
            {def.form.onDeath ? 'Triggers when he would die.' : `Unlocks at ${Math.round(def.form.hpThreshold * 100)}% HP, or when its meter is full.`} Permanent for the rest of the match.
          </p>
        )}
        <div className="skills">
          {kit(def, awakened, team).map((k) => (
            <SkillCard key={k.slot + k.skill.id} fighter={def.id} slot={k.slot} skill={k.skill} />
          ))}
        </div>
      </section>

      <section className="section two">
        <div className="card">
          <div className="label">Passive</div>
          <h3>{passive.name}</h3>
          <p>{passive.description}</p>
        </div>
        <div className="card">
          <div className="label">Default attack</div>
          <h3>{attack.name}</h3>
          <p>
            {attack.style === 'melee' ? 'Melee' : 'Ranged'} combo of {attack.combo}. {attack.damage} damage per hit, range {attack.range}, one hit every {attack.cooldown}s.
          </p>
        </div>
      </section>
    </div>
  );
}
