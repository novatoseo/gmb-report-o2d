// Fachada ilustrada de las tres casas (Maelo · Braña · Teleno), dibujada a partir
// de las fotos de dron: dos hastiales de pizarra a los lados, cuerpo central más bajo,
// cristaleras con madera, terraza corrida y planta baja gris oscura.

const lights = (pts: [number, number][], step = 9) => {
  let out = '';
  let k = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(1, Math.floor(len / step));
    for (let j = 0; j < n; j++) {
      const t = j / n;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t + 2.2 * Math.sin(t * Math.PI); // ligera catenaria
      out += `<circle class="bulb" style="animation-delay:${(k++ % 7) * -0.37}s" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.7"/>`;
    }
  }
  return out;
};

const mullions = (xs: number[], y1: number, y2: number) =>
  xs.map((x) => `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/>`).join('');

const balusters = (x1: number, x2: number) => {
  let s = '';
  for (let x = x1; x <= x2; x += 7) s += `<line x1="${x}" y1="688" x2="${x}" y2="698"/>`;
  return s;
};

/** Grupo SVG del edificio, en el sistema de coordenadas del valle (1600×900). */
export function buildingSVG(id: string): string {
  const gable = (x: number, unit: string, interior: string) => {
    const cx = x + 50;
    const glass = `M${x + 8} 700 V650 L${cx} 608 L${x + 92} 650 V700 Z`;
    return `
    <g class="unit unit-${unit}" data-unit="${unit}">
      <rect x="${x}" y="644" width="100" height="58" fill="var(--slate)"/>
      <path d="M${x - 9} 653 L${cx} 593 L${x + 109} 653 L${x + 101} 655 L${cx} 603 L${x - 1} 655 Z" fill="var(--slate)"/>
      <path class="glass" d="${glass}" fill="url(#${id}-glass)"/>
      <path class="glow" d="${glass}" fill="url(#${id}-warm)"/>
      <g class="interior">${interior}</g>
      <g class="timber">${mullions([x + 29, x + 50, x + 71], 626, 700)}<line x1="${x + 8}" y1="662" x2="${x + 92}" y2="662"/></g>
      <g class="lights">${lights([[x + 6, 652], [cx, 611], [x + 94, 652]])}</g>
    </g>`;
  };
  return `
  <g class="finca" role="img" aria-label="Las tres casas de La Finca del Valle">
    <ellipse class="halo" cx="800" cy="760" rx="260" ry="40" fill="url(#${id}-halo)"/>
    <!-- tejado principal detrás -->
    <path d="M636 650 L800 588 L964 650 Z" fill="var(--slate)"/>
    <path d="M700 612 L800 588 L900 612" stroke="var(--plinth)" stroke-width="2" fill="none" opacity=".6"/>
    ${gable(648, 'maelo', `<path d="M668 700 v-14 h26 v14 M672 686 v-6 h18 v6" /><circle cx="726" cy="664" r="5"/><line x1="726" y1="669" x2="726" y2="700" stroke-width="2"/>`)}
    <g class="unit unit-brana" data-unit="brana">
      <rect x="748" y="630" width="104" height="72" fill="var(--slate)"/>
      <path d="M742 634 H858 L852 624 H748 Z" fill="var(--slate)"/>
      <rect class="glass" x="756" y="642" width="88" height="58" fill="url(#${id}-glass)"/>
      <rect class="glow" x="756" y="642" width="88" height="58" fill="url(#${id}-warm)"/>
      <g class="interior"><path d="M770 700 v-12 q0 -6 6 -6 h30 q6 0 6 6 v12 z"/><path d="M826 700 l4 -22 l4 22 M818 680 h24 l-4 -10 h-16 z"/></g>
      <g class="timber">${mullions([778, 800, 822], 642, 700)}</g>
      <g class="lights">${lights([[754, 643], [846, 643]], 8)}</g>
    </g>
    ${gable(852, 'teleno', `<rect x="872" y="684" width="34" height="4"/><line x1="876" y1="688" x2="876" y2="700" stroke-width="2"/><line x1="902" y1="688" x2="902" y2="700" stroke-width="2"/><path d="M889 646 l-9 12 h18 z"/><line x1="889" y1="626" x2="889" y2="646" stroke-width="1.5"/>`)}
    <!-- terraza corrida -->
    <rect x="642" y="698" width="316" height="5" fill="var(--plinth)"/>
    <g class="rail">${balusters(652, 948)}<line x1="648" y1="688" x2="952" y2="688"/></g>
    <!-- planta baja -->
    <rect x="648" y="703" width="304" height="49" fill="var(--plinth)"/>
    <rect x="678" y="716" width="15" height="36" fill="var(--slate)"/>
    <rect x="785" y="714" width="30" height="38" fill="var(--slate)"/>
    <rect x="907" y="716" width="15" height="36" fill="var(--slate)"/>
    <g class="wall-lamps"><circle cx="700" cy="720" r="2.2"/><circle cx="778" cy="720" r="2.2"/><circle cx="822" cy="720" r="2.2"/><circle cx="900" cy="720" r="2.2"/></g>
  </g>`;
}

/** Degradados que necesita el edificio (van dentro de <defs>). */
export function buildingDefs(id: string): string {
  return `
    <linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" style="stop-color:var(--glass)"/>
      <stop offset="0.55" style="stop-color:var(--glass);stop-opacity:.85"/>
      <stop offset="1" style="stop-color:var(--sky3)"/>
    </linearGradient>
    <radialGradient id="${id}-warm" cx=".5" cy=".75" r=".8">
      <stop offset="0" stop-color="#ffe3a3"/>
      <stop offset=".55" stop-color="#ffbf62"/>
      <stop offset="1" stop-color="#d9893a"/>
    </radialGradient>
    <radialGradient id="${id}-halo">
      <stop offset="0" stop-color="#ffc56b" stop-opacity=".55"/>
      <stop offset="1" stop-color="#ffc56b" stop-opacity="0"/>
    </radialGradient>`;
}
