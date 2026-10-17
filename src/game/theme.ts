import type Phaser from 'phaser';
import { RENDER_SCALE } from './layout';

/** Fonts, colours and text styles shared by every scene. */
export const FONT_UI = '"Trebuchet MS", "Segoe UI", Arial, sans-serif';
export const FONT_IMPACT = 'Impact, "Arial Black", "Segoe UI Black", sans-serif';

export const COLORS = {
  bg: 0x0b0b12,
  panel: 0x161827,
  panelLight: 0x22253a,
  border: 0x3a3f5c,
  text: 0xf2f3f7,
  muted: 0x9aa0b8,
  hp: 0x4cd964,
  hpMid: 0xf2c94c,
  hpLow: 0xff4d4d,
  hpLag: 0xffffff,
  energy: 0x39a0ff,
  ult: 0xffc23d,
  danger: 0xff4d4d,
  subtitle: 0xffe066,
};

export const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

export function hpColor(frac: number): number {
  if (frac > 0.5) return COLORS.hp;
  if (frac > 0.25) return COLORS.hpMid;
  return COLORS.hpLow;
}

/** Mixes `c` toward white (amount > 0) or black (amount < 0). */
export function shade(c: number, amount: number): number {
  const ch = (shift: number) => {
    const v = (c >> shift) & 0xff;
    const t = amount > 0 ? 255 : 0;
    return Math.round(v + (t - v) * Math.abs(amount));
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export const textStyle = (size: number, color = COLORS.text, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) => ({
  fontFamily: FONT_UI,
  fontSize: `${size}px`,
  color: hex(color),
  // Rasterise text at the render scale so it stays crisp when the camera zooms it up.
  resolution: RENDER_SCALE,
  ...extra,
});

export const impactStyle = (size: number, color = COLORS.text, stroke = 0x000000) => ({
  fontFamily: FONT_IMPACT,
  fontSize: `${size}px`,
  color: hex(color),
  stroke: hex(stroke),
  strokeThickness: Math.max(3, Math.round(size / 8)),
  resolution: RENDER_SCALE,
});
