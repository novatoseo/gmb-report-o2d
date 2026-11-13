/** Zonas de cada casa en la foto de la fachada (x0, y0, x1, y1, en coordenadas de imagen 0–1). */
export const UNITS: Record<'maelo' | 'brana' | 'teleno', [number, number, number, number]> = {
  maelo: [0.02, 0.29, 0.345, 0.69],
  brana: [0.365, 0.47, 0.635, 0.69],
  teleno: [0.655, 0.29, 0.965, 0.69],
};
