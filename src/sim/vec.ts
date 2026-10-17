import type { Vec } from './types';

export const vec = (x = 0, y = 0): Vec => ({ x, y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
export const len = (a: Vec): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

export function norm(a: Vec): Vec {
  const l = len(a);
  return l > 1e-6 ? { x: a.x / l, y: a.y / l } : { x: 1, y: 0 };
}

export function rotate(a: Vec, angle: number): Vec {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

export const perp = (a: Vec): Vec => ({ x: -a.y, y: a.x });

/** Distance from point p to the segment a→b. */
export function distToSegment(p: Vec, a: Vec, b: Vec): number {
  const ab = sub(b, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / (ab.x ** 2 + ab.y ** 2 || 1)));
  return dist(p, { x: a.x + ab.x * t, y: a.y + ab.y * t });
}
