import type { Scene } from './livephoto';

// Ajustes de cada foto real. Posiciones en coordenadas de imagen (0–1, origen arriba a la izquierda).
export const SCENES = {
  atardecer: { name: 'atardecer', aspect: 1920 / 1086, focus: 0.55, strength: 0.022, twinkle: 1, glow: 0.55, sun: [0.0, 0.09, 0.9], dolly: 0.1 },
  fachada: { name: 'fachada', aspect: 1920 / 1084, focus: 0.62, strength: 0.028, clouds: 0.9, twinkle: 1, glow: 0.5, dolly: 0.08, zoom: 1.04 },
  amanecer: { name: 'amanecer', aspect: 1200 / 675, focus: 0.4, strength: 0.03, clouds: 0.7, fog: 0.35, sun: [0.61, 0.06, 0.75], dolly: 0.1 },
  otono: { name: 'otono', aspect: 1920 / 1080, focus: 0.5, strength: 0.03, clouds: 0.8, dolly: 0.1 },
  aerea: { name: 'aerea', aspect: 1920 / 1084, focus: 0.55, strength: 0.026, twinkle: 0.6, glow: 0.35, dolly: 0.1 },
  camino: { name: 'camino', aspect: 1920 / 1086, focus: 0.45, strength: 0.03, clouds: 0.9, twinkle: 0.6, glow: 0.35, dolly: 0.12 },
  invierno: { name: 'invierno', aspect: 1920 / 1080, focus: 0.5, strength: 0.03, snow: 1, fog: 0.4, dolly: 0.08 },
} satisfies Record<string, Scene>;

/** Copia editable de una escena (para animar sus valores sin tocar la base). */
export const scene = (k: keyof typeof SCENES, extra: Partial<Scene> = {}): Scene => ({ ...(SCENES[k] as Scene), ...extra });

/** Fotos de «Un día en la finca», en el orden de los momentos. */
export const DAY_SCENES = (): Scene[] => [
  scene('amanecer'),
  scene('otono'),
  scene('aerea'),
  scene('camino'),
  scene('fachada'),
  scene('atardecer', { night: 0.9, glow: 1, fog: 0.12, sun: [0, 0, 0] }),
];

/** Zonas de cada casa en la foto de la fachada (x0, y0, x1, y1). */
export const UNITS: Record<'maelo' | 'brana' | 'teleno', [number, number, number, number]> = {
  maelo: [0.02, 0.29, 0.345, 0.69],
  brana: [0.365, 0.47, 0.635, 0.69],
  teleno: [0.655, 0.29, 0.965, 0.69],
};
