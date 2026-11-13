import { buildingDefs, buildingSVG } from './building';
import { frameAt, type Frame } from './palette';

// Valle ilustrado de Vegacervera: montañas de caliza, pueblo en ladera, prado con ovejas
// y las tres casas. Todos los colores son variables CSS que reescribe el ciclo de luz.

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VILLAGE: [number, number, number, number][] = [
  [318, 646, 46, 30], [372, 640, 38, 26], [420, 632, 52, 34], [486, 626, 40, 28], [540, 622, 46, 32],
  [596, 624, 36, 24], [690, 614, 30, 20], [905, 606, 36, 24], [952, 600, 46, 32], [1062, 598, 38, 28],
  [1112, 602, 50, 34], [1172, 606, 40, 26], [1224, 612, 46, 30], [1280, 618, 38, 26], [1336, 628, 44, 30],
];

function village(r: () => number) {
  return VILLAGE.map(([x, b, w, h], i) => {
    const top = b - h;
    const lit = r() > 0.35;
    const win = `<rect x="${x + w * 0.3}" y="${top + h * 0.35}" width="5" height="6" class="${lit ? 'vwin lit' : 'vwin'}"/>` +
      (w > 40 ? `<rect x="${x + w * 0.62}" y="${top + h * 0.35}" width="5" height="6" class="${r() > 0.5 ? 'vwin lit' : 'vwin'}"/>` : '');
    return `<g class="vh" style="--i:${i}">
      <rect x="${x}" y="${top}" width="${w}" height="${h}" fill="var(--village)"/>
      <path d="M${x - 4} ${top + 1} L${x + w / 2} ${top - h * 0.42} L${x + w + 4} ${top + 1} Z" fill="var(--roof)"/>
      ${win}
    </g>`;
  }).join('');
}

const church = (x: number, b: number) => `
  <g class="church">
    <rect x="${x}" y="${b - 34}" width="40" height="34" fill="var(--village)"/>
    <path d="M${x - 3} ${b - 33} L${x + 20} ${b - 46} L${x + 43} ${b - 33} Z" fill="var(--roof)"/>
    <path d="M${x + 40} ${b} V${b - 56} L${x + 49} ${b - 66} L${x + 58} ${b - 56} V${b} Z" fill="var(--village)"/>
    <path d="M${x + 45} ${b - 50} a4 4 0 0 1 8 0 v7 h-8 z" fill="var(--slate)"/>
  </g>`;

function trees(r: () => number) {
  const spots: [number, number, number, 'round' | 'poplar', 1 | 2][] = [
    [250, 668, 22, 'round', 2], [292, 660, 16, 'round', 1], [470, 640, 18, 'round', 2], [618, 660, 26, 'round', 2],
    [660, 648, 10, 'poplar', 1], [880, 640, 9, 'poplar', 1], [985, 664, 24, 'round', 2], [1020, 626, 16, 'round', 1],
    [1210, 644, 20, 'round', 2], [1300, 652, 10, 'poplar', 1], [1400, 664, 24, 'round', 1], [1460, 672, 18, 'round', 2],
    [140, 690, 26, 'round', 1], [580, 708, 28, 'round', 2], [1015, 712, 30, 'round', 1], [1540, 690, 22, 'round', 2],
  ];
  return spots.map(([x, y, s, kind, tone]) => {
    const fill = `var(--tree${tone})`;
    const trunk = `<rect x="${x - 1.5}" y="${y}" width="3" height="${s * 0.7}" fill="var(--slate)" opacity=".7"/>`;
    if (kind === 'poplar') return `<g class="tree sway" style="--d:${(r() * -4).toFixed(2)}s">${trunk}<ellipse cx="${x}" cy="${y - s * 2}" rx="${s}" ry="${s * 3.2}" fill="${fill}"/></g>`;
    return `<g class="tree sway" style="--d:${(r() * -4).toFixed(2)}s">${trunk}
      <circle cx="${x}" cy="${y - s * 0.6}" r="${s}" fill="${fill}"/>
      <circle cx="${x - s * 0.7}" cy="${y - s * 0.1}" r="${s * 0.7}" fill="${fill}"/>
      <circle cx="${x + s * 0.7}" cy="${y - s * 0.15}" r="${s * 0.75}" fill="${fill}"/></g>`;
  }).join('');
}

const sheep = (x: number, y: number, s: number, flip: boolean, i: number) => `
  <g class="sheep" data-sheep="${i}" transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
    <g class="sheep-hop">
      <g class="legs"><line x1="-9" y1="-2" x2="-9" y2="7"/><line x1="-3" y1="-2" x2="-3" y2="7"/><line x1="5" y1="-2" x2="5" y2="7"/><line x1="10" y1="-2" x2="10" y2="7"/></g>
      <g fill="var(--wool)">
        <circle cx="-10" cy="-8" r="8"/><circle cx="0" cy="-10" r="9.5"/><circle cx="10" cy="-8" r="8"/>
        <circle cx="-4" cy="-15" r="7"/><circle cx="6" cy="-15" r="6.5"/>
      </g>
      <g class="head" style="animation-delay:${i * -1.7}s">
        <ellipse cx="18" cy="-10" rx="6" ry="5" fill="#2a2726"/>
        <ellipse cx="14" cy="-14" rx="3" ry="1.6" fill="#2a2726" transform="rotate(-25 14 -14)"/>
      </g>
    </g>
  </g>`;

function stars(r: () => number) {
  let s = '';
  for (let i = 0; i < 120; i++) {
    const x = r() * 1600;
    const y = r() * r() * 560;
    const rad = 0.5 + r() * 1.5;
    s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rad.toFixed(2)}"${r() > 0.6 ? ` class="tw" style="animation-delay:${(-r() * 5).toFixed(2)}s"` : ''}/>`;
  }
  return s;
}

const cloud = (x: number, y: number, s: number, dur: number, delay: number) => `
  <g class="cloud" style="--dur:${dur}s;animation-delay:${delay}s">
    <g transform="translate(${x} ${y}) scale(${s})">
      <ellipse cx="0" cy="0" rx="70" ry="22"/><ellipse cx="-30" cy="-12" rx="34" ry="24"/>
      <ellipse cx="18" cy="-20" rx="38" ry="30"/><ellipse cx="52" cy="-6" rx="28" ry="18"/>
    </g>
  </g>`;

function flowers(r: () => number) {
  const colors = ['#f7e37c', '#ffffff', '#ee9cb8', '#f6b25c'];
  let s = '';
  for (let i = 0; i < 70; i++) {
    const x = r() * 1600;
    const y = 800 + r() * 95;
    s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1.6 + r() * 1.8).toFixed(1)}" fill="${colors[i % 4]}"/>`;
  }
  return s;
}

function tufts(r: () => number) {
  let s = '';
  for (let i = 0; i < 46; i++) {
    const x = r() * 1600;
    const y = 830 + r() * 70;
    const h = 8 + r() * 10;
    s += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} l3 -${h.toFixed(0)} l3 ${h.toFixed(0)} l3 -${(h * 0.7).toFixed(0)} l3 ${(h * 0.7).toFixed(0)}z"/>`;
  }
  return s;
}

function fireflies(r: () => number) {
  let s = '';
  for (let i = 0; i < 18; i++) {
    s += `<circle class="ff" cx="${(r() * 1600).toFixed(0)}" cy="${(700 + r() * 170).toFixed(0)}" r="2.4" style="animation-delay:${(-r() * 6).toFixed(2)}s;--fx:${(r() * 40 - 20).toFixed(0)}px;--fy:${(-10 - r() * 30).toFixed(0)}px"/>`;
  }
  return s;
}

export interface ValleyOptions {
  id: string;
  viewBox?: string;
  preserve?: string;
  label: string;
}

export function valleySVG({ id, viewBox = '0 0 1600 900', preserve = 'xMidYMax slice', label }: ValleyOptions) {
  const r = rng(7);
  return `
<svg class="valley" viewBox="${viewBox}" preserveAspectRatio="${preserve}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--sky1)"/>
      <stop offset=".55" style="stop-color:var(--sky2)"/>
      <stop offset="1" style="stop-color:var(--sky3)"/>
    </linearGradient>
    <radialGradient id="${id}-sunglow">
      <stop offset="0" style="stop-color:var(--sun);stop-opacity:.75"/>
      <stop offset=".35" style="stop-color:var(--sun);stop-opacity:.25"/>
      <stop offset="1" style="stop-color:var(--sun);stop-opacity:0"/>
    </radialGradient>
    <linearGradient id="${id}-fog" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".5" stop-color="#fff" stop-opacity=".7"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${id}-shoot" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#fff"/>
    </linearGradient>
    <radialGradient id="${id}-moonglow">
      <stop offset="0" stop-color="#fff6dc" stop-opacity=".28"/>
      <stop offset="1" stop-color="#fff6dc" stop-opacity="0"/>
    </radialGradient>
    <mask id="${id}-moon"><circle r="26" fill="#fff"/><circle cx="11" cy="-7" r="23" fill="#000"/></mask>
    ${buildingDefs(id)}
  </defs>

  <g class="layer" data-depth="0">
    <rect x="-200" y="-200" width="2000" height="1300" fill="url(#${id}-sky)"/>
    <g class="stars" fill="#fff">${stars(r)}</g>
    <g class="shooting"><line x1="0" y1="0" x2="120" y2="0" stroke="url(#${id}-shoot)" stroke-width="2" stroke-linecap="round"/></g>
  </g>

  <g class="layer" data-depth="0.04">
    <g class="sun"><circle r="160" fill="url(#${id}-sunglow)"/><circle r="34" style="fill:var(--sun)"/></g>
    <g class="moon"><circle r="110" fill="url(#${id}-moonglow)"/><circle r="26" fill="#f6f0dc" mask="url(#${id}-moon)"/></g>
  </g>

  <g class="layer" data-depth="0.12">
    <path fill="var(--far)" d="M-120 540 L0 500 L80 470 L150 492 L230 398 L290 432 L360 330 L420 382 L470 350 L540 412 L620 362 L700 300 L760 342 L820 288 L880 330 L960 278 L1030 342 L1100 308 L1180 372 L1250 318 L1330 392 L1400 348 L1480 412 L1540 382 L1720 430 L1720 900 L-120 900Z"/>
    <g fill="var(--farHi)" opacity=".55">
      <path d="M360 330 L330 380 L352 420 L372 372Z"/><path d="M700 300 L668 352 L690 392 L708 345Z"/>
      <path d="M820 288 L795 330 L812 372 L828 330Z"/><path d="M960 278 L930 330 L950 372 L968 326Z"/>
      <path d="M1250 318 L1222 362 L1240 398 L1258 360Z"/><path d="M230 398 L208 432 L222 462 L238 430Z"/>
      <path d="M1100 308 L1080 340 L1094 370 L1108 340Z"/>
    </g>
  </g>

  <g class="layer clouds" data-depth="0.18" fill="var(--cloud)">
    ${cloud(200, 170, 1.1, 140, -20)}${cloud(900, 120, 0.8, 170, -95)}${cloud(500, 250, 0.6, 120, -60)}${cloud(1300, 210, 1, 155, -130)}
  </g>

  <g class="layer" data-depth="0.26">
    <path fill="var(--mid)" d="M-120 610 L0 600 C120 540 220 520 330 545 C430 568 500 470 640 470 C760 470 820 540 930 530 C1040 520 1100 450 1230 455 C1360 460 1450 540 1600 520 L1720 520 L1720 900 L-120 900Z"/>
    <path fill="var(--midShade)" d="M640 470 C760 470 820 540 930 530 C860 560 760 560 700 600 C690 560 680 500 640 470Z M1230 455 C1360 460 1450 540 1600 520 L1720 520 L1720 620 C1540 600 1420 560 1300 520 C1280 490 1260 470 1230 455Z M330 545 C430 568 470 520 520 498 C480 560 420 600 330 600Z"/>
    <g fill="var(--far)" opacity=".7"><path d="M600 486 l14 -10 l12 12 z"/><path d="M1190 470 l18 -12 l14 14 z"/><path d="M280 548 l12 -8 l10 10 z"/></g>
    <g class="birds"><g class="flock">
      <path d="M0 0 q6 -6 12 0 q6 -6 12 0"/><path d="M30 14 q5 -5 10 0 q5 -5 10 0"/><path d="M-22 18 q5 -5 10 0 q5 -5 10 0"/>
    </g></g>
  </g>

  <rect class="fog" x="-200" y="520" width="2000" height="140" fill="url(#${id}-fog)"/>

  <g class="layer" data-depth="0.42">
    <path fill="var(--hill)" d="M-120 700 L0 690 C180 650 360 615 560 622 C760 630 900 595 1100 600 C1300 606 1460 640 1600 640 L1720 640 L1720 900 L-120 900Z"/>
    <g class="walls" stroke="var(--meadowDk)" stroke-width="2" fill="none" opacity=".5">
      <path d="M40 700 C200 668 360 640 520 640"/><path d="M1120 616 C1300 622 1450 650 1600 660"/>
    </g>
    <g class="village">${village(r)}${church(1000, 600)}</g>
    <g class="trees">${trees(r)}</g>
  </g>

  <g class="layer" data-depth="0.6">
    <path fill="var(--meadow)" d="M-120 780 L0 760 C260 712 520 700 800 706 C1080 712 1340 700 1600 730 L1720 740 L1720 900 L-120 900Z"/>
    <g stroke="var(--meadowDk)" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="1 7" opacity=".9">
      <path d="M60 800 C300 762 480 752 640 752"/><path d="M960 754 C1150 750 1350 762 1560 796"/>
    </g>
    <path fill="var(--path)" d="M250 900 C380 830 600 786 772 752 L800 752 C690 806 500 852 430 900Z"/>
    ${buildingSVG(id)}
  </g>

  <g class="layer flock-layer" data-depth="0.72">
    ${sheep(520, 790, 1, false, 0)}${sheep(572, 808, 0.9, true, 1)}${sheep(1060, 786, 1, true, 2)}
    ${sheep(1124, 802, 1.1, false, 3)}${sheep(1236, 824, 1.25, true, 4)}${sheep(372, 836, 1.3, false, 5)}
  </g>

  <g class="layer" data-depth="1">
    <path fill="var(--meadowDk)" d="M-120 860 L0 852 C300 820 700 842 1000 832 C1250 822 1450 838 1600 828 L1720 828 L1720 1000 L-120 1000Z"/>
    <g class="tufts" fill="var(--meadowDk)">${tufts(r)}</g>
    <g class="flowers">${flowers(r)}</g>
    <g class="fireflies" fill="#fff6a8">${fireflies(r)}</g>
  </g>
</svg>`;
}

export class Valley {
  svg: SVGSVGElement | null = null;
  private layers: { el: SVGGElement; depth: number }[] = [];
  private sun: SVGGElement | null = null;
  private moon: SVGGElement | null = null;
  private hour = -1;
  private pending: number | null = null;
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private shift = 0;
  private raf = 0;
  private visible = false;
  private parallax: boolean;
  dark = false;
  onFrame?: (f: Frame, hour: number) => void;

  /** Con `lazy`, el SVG no se crea hasta que la escena está cerca de la pantalla. */
  constructor(readonly host: HTMLElement, private opts: ValleyOptions & { parallax?: boolean; lazy?: boolean }) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.parallax = !!opts.parallax && !reduced;

    if (opts.lazy) {
      const near = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        near.disconnect();
        this.mount();
      }, { rootMargin: '150% 0px' });
      near.observe(host);
    } else {
      this.mount();
    }

    const io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      host.classList.toggle('is-paused', !e.isIntersecting);
      if (this.visible && this.parallax && !this.raf) this.loop();
    });
    io.observe(host);

    if (this.parallax) {
      window.addEventListener('pointermove', (e) => {
        this.pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
        this.pointer.ty = (e.clientY / innerHeight - 0.5) * 2;
      }, { passive: true });
      window.addEventListener('deviceorientation', (e) => {
        if (e.gamma == null || e.beta == null) return;
        this.pointer.tx = Math.max(-1, Math.min(1, e.gamma / 25));
        this.pointer.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
      }, { passive: true });
    }
  }

  private mount() {
    if (this.svg) return;
    this.host.insertAdjacentHTML('afterbegin', valleySVG(this.opts));
    this.svg = this.host.querySelector('svg.valley')!;
    this.layers = [...this.svg.querySelectorAll<SVGGElement>('.layer')].map((el) => ({ el, depth: Number(el.dataset.depth) }));
    this.sun = this.svg.querySelector('.sun');
    this.moon = this.svg.querySelector('.moon');
    if (this.pending != null) {
      const h = this.pending;
      this.pending = null;
      this.hour = -1;
      this.setHour(h);
    }
    this.apply();
  }

  /** Desplazamiento vertical de las capas (parallax al hacer scroll), en px de pantalla. */
  setShift(px: number) {
    this.shift = px;
    if (!this.raf) this.apply();
  }

  setHour(hour: number) {
    if (!this.svg) {
      this.pending = hour;
      return;
    }
    if (Math.abs(hour - this.hour) < 0.004) return;
    this.hour = hour;
    const f = frameAt(hour);
    const style = this.svg.style;
    for (const k in f.vars) style.setProperty(k, f.vars[k]);
    this.sun!.setAttribute('transform', `translate(${f.sun.x.toFixed(1)} ${f.sun.y.toFixed(1)})`);
    this.moon!.setAttribute('transform', `translate(${f.moon.x.toFixed(1)} ${f.moon.y.toFixed(1)})`);
    if (f.dark !== this.dark) {
      this.dark = f.dark;
      this.host.classList.toggle('is-dark', f.dark);
    }
    this.onFrame?.(f, hour);
  }

  private apply() {
    if (!this.layers.length || (!this.parallax && !this.shift)) return;
    const rect = this.host.getBoundingClientRect();
    const scale = Math.max(rect.width / 1600, rect.height / 900) || 1;
    const p = this.pointer;
    for (const { el, depth } of this.layers) {
      const dx = (-p.x * 26 * depth) / scale;
      const dy = (-p.y * 10 * depth + this.shift * (1 - depth) * 0.55) / scale;
      el.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
    }
  }

  private loop = () => {
    if (!this.visible) {
      this.raf = 0;
      return;
    }
    const p = this.pointer;
    p.x += (p.tx - p.x) * 0.06;
    p.y += (p.ty - p.y) * 0.06;
    this.apply();
    this.raf = requestAnimationFrame(this.loop);
  };
}
