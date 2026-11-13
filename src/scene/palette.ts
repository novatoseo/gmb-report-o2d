// Ciclo de luz del valle: paletas por hora del día, interpoladas en tiempo real.

type Colors = {
  sky1: string; sky2: string; sky3: string;
  sun: string; far: string; farHi: string; mid: string; midShade: string;
  hill: string; village: string; roof: string; tree1: string; tree2: string;
  meadow: string; meadowDk: string; path: string; slate: string; plinth: string;
  glass: string; cloud: string; wool: string;
};
type Scalars = { stars: number; glow: number; fog: number; birds: number; fireflies: number; cloudO: number; sunO: number; moonO: number };
type Key = { h: number; c: Colors; s: Scalars };

const NIGHT: Key = {
  h: 0,
  c: {
    sky1: '#070b1f', sky2: '#121a3a', sky3: '#26305a',
    sun: '#ffe9b0', far: '#2a3150', farHi: '#3c4670', mid: '#1c2538', midShade: '#151c2c',
    hill: '#18242a', village: '#3a3c4e', roof: '#3b2e36', tree1: '#121d1d', tree2: '#1f1d26',
    meadow: '#16261f', meadowDk: '#0f1b16', path: '#2b2d33', slate: '#16181e', plinth: '#1d2026',
    glass: '#22293a', cloud: '#2a3256', wool: '#9aa3bd',
  },
  s: { stars: 1, glow: 1, fog: 0.1, birds: 0, fireflies: 1, cloudO: 0.55, sunO: 0, moonO: 1 },
};

const KEYS: Key[] = [
  NIGHT,
  {
    h: 5,
    c: { ...NIGHT.c, sky1: '#0d1230', sky2: '#28305e', sky3: '#5a4a78', far: '#343a60', mid: '#232c42' },
    s: { ...NIGHT.s, stars: 0.85 },
  },
  {
    h: 6.6,
    c: {
      sky1: '#33417a', sky2: '#9b7fb0', sky3: '#ffb48a',
      sun: '#ffd27a', far: '#8e86a6', farHi: '#d8b9bd', mid: '#4f5a5e', midShade: '#3d474d',
      hill: '#4d6248', village: '#a08a84', roof: '#9a5a4e', tree1: '#3f5a3e', tree2: '#9a5a48',
      meadow: '#5e7d4c', meadowDk: '#45603a', path: '#a48d7a', slate: '#33363f', plinth: '#3f434c',
      glass: '#8e8fb5', cloud: '#ffc7b0', wool: '#f3dcd2',
    },
    s: { stars: 0.15, glow: 0.65, fog: 0.75, birds: 0.4, fireflies: 0, cloudO: 0.8, sunO: 1, moonO: 0 },
  },
  {
    h: 8.3,
    c: {
      sky1: '#4f8fd6', sky2: '#93c3ec', sky3: '#fde6c4',
      sun: '#fff1c4', far: '#b7c0d0', farHi: '#eef0f4', mid: '#71905f', midShade: '#5b7a50',
      hill: '#7ba35a', village: '#d8c2a2', roof: '#b9603f', tree1: '#557f3c', tree2: '#c87a3c',
      meadow: '#8cba5c', meadowDk: '#6e9a47', path: '#cdb48f', slate: '#3b3f46', plinth: '#4a4f57',
      glass: '#b8d0de', cloud: '#ffffff', wool: '#fbf7ee',
    },
    s: { stars: 0, glow: 0.12, fog: 0.35, birds: 1, fireflies: 0, cloudO: 0.95, sunO: 1, moonO: 0 },
  },
  {
    h: 13,
    c: {
      sky1: '#3a86d8', sky2: '#86c0ef', sky3: '#d9eefa',
      sun: '#fffbe6', far: '#c3cad6', farHi: '#f6f7fa', mid: '#6f9a58', midShade: '#5a8249',
      hill: '#86b25e', village: '#e2cfae', roof: '#c0643f', tree1: '#4f7f38', tree2: '#cf8540',
      meadow: '#96c463', meadowDk: '#76a64c', path: '#d8c19b', slate: '#3c4047', plinth: '#4d525a',
      glass: '#c3dbe8', cloud: '#ffffff', wool: '#ffffff',
    },
    s: { stars: 0, glow: 0.08, fog: 0, birds: 1, fireflies: 0, cloudO: 1, sunO: 1, moonO: 0 },
  },
  {
    h: 17,
    c: {
      sky1: '#4d84c8', sky2: '#a6c7e6', sky3: '#fbe1b0',
      sun: '#ffe7a3', far: '#c9b9b0', farHi: '#f4e3d2', mid: '#7c8d4f', midShade: '#647443',
      hill: '#93a855', village: '#e3c49a', roof: '#c25e36', tree1: '#5d7d34', tree2: '#d97a33',
      meadow: '#a2ba5a', meadowDk: '#83a046', path: '#dcbd8e', slate: '#3e3f45', plinth: '#4f5158',
      glass: '#d6d4c8', cloud: '#fff4e2', wool: '#fff6e8',
    },
    s: { stars: 0, glow: 0.2, fog: 0, birds: 0.9, fireflies: 0, cloudO: 1, sunO: 1, moonO: 0 },
  },
  {
    h: 19.4,
    c: {
      sky1: '#3e5a9c', sky2: '#d58a8a', sky3: '#ffb35c',
      sun: '#ffb04a', far: '#a77e86', farHi: '#f0b48e', mid: '#6b6046', midShade: '#55503e',
      hill: '#7d7c45', village: '#d9a77a', roof: '#a94a32', tree1: '#4f5a2e', tree2: '#d3612e',
      meadow: '#8c8f45', meadowDk: '#6e7437', path: '#c99b70', slate: '#33323a', plinth: '#403f46',
      glass: '#ffbf73', cloud: '#ffb08a', wool: '#ffe0c4',
    },
    s: { stars: 0, glow: 0.75, fog: 0.15, birds: 0.6, fireflies: 0, cloudO: 1, sunO: 1, moonO: 0 },
  },
  {
    h: 20.8,
    c: {
      sky1: '#1b2152', sky2: '#5a3d72', sky3: '#e2766a',
      sun: '#ff8a4a', far: '#5a4d6e', farHi: '#8e6a86', mid: '#363449', midShade: '#2b2a3c',
      hill: '#36403e', village: '#7a6572', roof: '#6a3e44', tree1: '#25302a', tree2: '#5e3a3a',
      meadow: '#33452f', meadowDk: '#273726', path: '#5b5052', slate: '#22232a', plinth: '#2b2c33',
      glass: '#3a3550', cloud: '#7a5a86', wool: '#c9b9c9',
    },
    s: { stars: 0.45, glow: 1, fog: 0.25, birds: 0, fireflies: 0.6, cloudO: 0.8, sunO: 0, moonO: 0.6 },
  },
  { ...NIGHT, h: 22.2 },
  { ...NIGHT, h: 24 },
];

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mix = (a: string, b: string, t: number) => {
  const A = hex(a), B = hex(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
};
const ease = (t: number) => t * t * (3 - 2 * t);

export interface Frame {
  vars: Record<string, string>;
  /** true cuando el cielo es oscuro y el texto encima debe ser claro */
  dark: boolean;
  sun: { x: number; y: number };
  moon: { x: number; y: number };
}

/** Normaliza cualquier hora a [0, 24). */
export const wrap = (h: number) => ((h % 24) + 24) % 24;

export function frameAt(hour: number): Frame {
  const h = wrap(hour);
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= h) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = ease((h - a.h) / (b.h - a.h || 1));
  const vars: Record<string, string> = {};
  for (const k in a.c) vars[`--${k}`] = mix(a.c[k as keyof Colors], b.c[k as keyof Colors], t);
  for (const k in a.s) {
    const v = a.s[k as keyof Scalars] + (b.s[k as keyof Scalars] - a.s[k as keyof Scalars]) * t;
    vars[`--${k}`] = v.toFixed(3);
  }
  // El sol recorre un arco de 6:15 a 21:00; la luna, el resto de la noche.
  const arc = (p: number) => ({ x: 120 + p * 1360, y: 470 - Math.sin(p * Math.PI) * 360 });
  const sunP = (h - 6.25) / (21 - 6.25);
  const moonP = wrap(h - 20.5) / 10;
  const sky = hex(KEYS[i].c.sky2).map((v, j) => v + (hex(b.c.sky2)[j] - v) * t);
  const lum = 0.2126 * sky[0] + 0.7152 * sky[1] + 0.0722 * sky[2];
  return {
    vars,
    dark: lum < 120,
    sun: arc(Math.min(Math.max(sunP, -0.05), 1.05)),
    moon: arc(Math.min(Math.max(moonP, 0), 1)),
  };
}

export type Phase = 'night' | 'dawn' | 'morning' | 'midday' | 'afternoon' | 'golden' | 'dusk';

export function phaseOf(hour: number): Phase {
  const h = wrap(hour);
  if (h < 5.8 || h >= 21.8) return 'night';
  if (h < 7.8) return 'dawn';
  if (h < 11.8) return 'morning';
  if (h < 15) return 'midday';
  if (h < 18.3) return 'afternoon';
  if (h < 20.3) return 'golden';
  return 'dusk';
}

export function madridHour(): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const hh = Number(parts.find((p) => p.type === 'hour')?.value ?? 12);
    const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return hh + mm / 60;
  } catch {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }
}

export const fmtHour = (hour: number) => {
  const h = wrap(hour);
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};
