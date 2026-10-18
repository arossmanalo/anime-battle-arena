import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { ANIMS, type AnimName } from '../../game/assets';
import type { FighterDef } from '../../sim/types';
import { hexColor } from '../info';
import { useStore } from '../store';

/* A fighter's sprite sheet row, played with CSS background positions. */

const FPS: Record<AnimName, number> = { idle: 6, run: 10, cast: 10, hit: 8, ko: 8, attack: 12 };

export function Sprite({ def, form = false, anim = 'idle', size = 128, flip = false, className }: { def: FighterDef; form?: boolean; anim?: AnimName; size?: number; flip?: boolean; className?: string }) {
  const { manifest } = useStore();
  const entry = manifest.fighters[def.id];
  const sheet = form ? entry?.formSheet ?? entry?.sheet : entry?.sheet;
  const [frame, setFrame] = useState(0);
  const row = ANIMS.indexOf(anim);
  const count = Math.max(1, sheet?.frames?.[anim] ?? 1);

  useEffect(() => {
    setFrame(0);
    if (count <= 1) return;
    const loop = anim !== 'ko';
    const t = setInterval(() => setFrame((f) => (loop ? (f + 1) % count : Math.min(count - 1, f + 1))), 1000 / FPS[anim]);
    return () => clearInterval(t);
  }, [anim, count, def.id, form]);

  if (!sheet) return <Disc def={def} size={size} />;
  const fw = sheet.frameWidth;
  const fh = sheet.frameHeight;
  const scale = size / fw;
  const src = `assets/fighters/${def.id}/${form && entry?.formSheet ? 'form/' : ''}sheet.png${manifest.version ? `?v=${manifest.version}` : ''}`;
  const style: CSSProperties = {
    width: size,
    height: (fh * size) / fw,
    backgroundImage: `url(${src})`,
    backgroundSize: `${sheet.columns * fw * scale}px auto`,
    backgroundPosition: `-${frame * fw * scale}px -${row * fh * scale}px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
    transform: flip ? 'scaleX(-1)' : undefined,
  };
  return <div className={`sprite ${className ?? ''}`} style={style} role="img" aria-label={`${def.name}`} />;
}

function Disc({ def, size }: { def: FighterDef; size: number }) {
  return (
    <div className="disc" style={{ width: size * 0.6, height: size * 0.6, background: hexColor(def.color) }}>
      {def.initials}
    </div>
  );
}

/** Square portrait from portrait.png, or a coloured disc with initials. */
export function Portrait({ def, size = 64 }: { def: FighterDef; size?: number }) {
  const { manifest } = useStore();
  const has = manifest.fighters[def.id]?.portrait;
  return (
    <div className="portrait" style={{ width: size, height: size, background: hexColor(def.color) }}>
      {has ? <img src={`assets/fighters/${def.id}/portrait.png${manifest.version ? `?v=${manifest.version}` : ''}`} alt={def.name} /> : <span>{def.initials}</span>}
    </div>
  );
}

export function Button({ children, to, onClick, variant = 'primary', disabled }: { children: ReactNode; to?: LinkProps['to']; onClick?: () => void; variant?: 'primary' | 'plain' | 'danger'; disabled?: boolean }) {
  const cls = `btn btn-${variant}`;
  if (to && !disabled) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/** Ten-pip meter: reads as a number first, a bar second. */
export function Pips({ label, value, text }: { label: string; value: number; text: string }) {
  const on = Math.round(Math.max(0, Math.min(100, value)) / 10);
  return (
    <div className="pips">
      <span className="pips-label">{label}</span>
      <span className="pips-row" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} className={i < on ? 'on' : ''} />
        ))}
      </span>
      <span className="pips-text">{text}</span>
    </div>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {children && <p className="lede">{children}</p>}
    </header>
  );
}

export function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span className="tag" style={{ ['--tag' as string]: color }}>
      {label}
    </span>
  );
}
