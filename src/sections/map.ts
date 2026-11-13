import { gsap } from 'gsap';
import { CATS, FINCA_XY, PLACES, type Cat, type Place } from '../content';
import { onLang, t, tr } from '../i18n';

const ICONS: Record<Cat, string> = {
  nature: '<path d="M12 3c5 3 7 7 5 11-1.5 3-5 4-5 7M12 21c0-3-3.5-4-5-7-2-4 0-8 5-11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  adventure: '<path d="M3 19l6-10 4 6 2-3 6 7z" fill="currentColor"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  food: '<path d="M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M16 3c-2 2-2 6 0 8v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  arrive: '<rect x="6" y="4" width="12" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 20l2-3M16 20l-2-3M6 11h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};

const color = (c: Cat) => CATS.find((x) => x.id === c)!.color;

function mountains() {
  // Cordillera al norte y sierras sueltas: pequeños picos de caliza dibujados a mano.
  const peaks: [number, number, number][] = [
    [60, 170, 1.2], [110, 150, 0.9], [190, 175, 1.1], [260, 140, 1.3], [330, 165, 1], [400, 130, 1.4], [460, 160, 1],
    [540, 140, 1.2], [610, 160, 1], [680, 135, 1.3], [840, 150, 1.1], [900, 170, 0.9], [80, 260, 0.8], [360, 240, 0.9],
    [580, 220, 1], [700, 250, 0.9], [860, 300, 0.8], [130, 360, 0.8], [600, 380, 0.9], [380, 330, 0.9], [740, 380, 0.8],
    [300, 520, 0.7], [640, 560, 0.7], [860, 540, 0.8], [150, 600, 0.7],
  ];
  return peaks.map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-26 14 L-6 -18 L2 -6 L10 -14 L28 14Z" class="mt"/><path d="M-6 -18 L-12 -2 L-4 4 L2 -6Z" class="mt-hi"/><path d="M-12 -8 l4 -2 M14 -4 l4 -2" class="mt-snow"/></g>`).join('');
}

function forests() {
  const spots: [number, number][] = [
    [280, 410], [320, 440], [300, 395], [240, 450], [270, 300], [210, 320], [560, 300], [540, 420], [420, 300], [660, 430],
    [700, 320], [820, 410], [380, 560], [600, 620], [200, 540], [880, 380], [120, 450], [760, 600],
  ];
  return spots.map(([x, y]) => `<g class="tree"><circle cx="${x}" cy="${y}" r="9"/><circle cx="${x + 11}" cy="${y + 4}" r="7"/><circle cx="${x - 9}" cy="${y + 5}" r="6"/></g>`).join('');
}

function mapSVG() {
  return `
  <svg class="map-svg" viewBox="0 0 1000 750" role="img" aria-label="Mapa ilustrado del entorno de La Finca del Valle" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="paper" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="#000" opacity=".05"/></pattern>
      <mask id="route-mask"><path id="route-reveal" d="" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/></mask>
    </defs>
    <rect width="1000" height="750" rx="28" class="land"/>
    <rect width="1000" height="750" rx="28" fill="url(#paper)"/>
    <path class="biosphere" d="M330 210 C420 180 590 190 660 250 C720 300 700 430 620 490 C540 540 400 530 330 480 C260 430 250 260 330 210Z"/>
    <text class="label biosphere-label"><textPath href="#bio-path" startOffset="8%">Reserva de la Biosfera de los Argüellos</textPath></text>
    <path id="bio-path" d="M335 200 C420 170 590 180 660 240" fill="none"/>
    <g class="forest">${forests()}</g>
    <g class="mts">${mountains()}</g>
    <!-- ríos -->
    <path class="river" d="M480 40 C470 140 520 220 495 300 C470 380 450 430 470 520 C490 600 470 680 470 760"/>
    <path class="river" d="M150 40 C170 140 210 240 200 340 C190 450 260 560 330 640 C380 700 430 730 450 760"/>
    <path class="river" d="M790 120 C770 220 800 330 780 420 C760 520 740 640 720 760"/>
    <path class="lake" d="M880 190 C910 170 960 180 975 205 C990 235 960 250 935 245 C915 262 890 250 892 232 C870 228 864 205 880 190Z"/>
    <path class="lake" d="M760 470 c18 -14 46 -8 50 10 c4 18 -20 30 -38 24 c-18 -4 -26 -22 -12 -34z"/>
    <!-- carreteras -->
    <path class="road" d="M470 740 C480 650 500 590 505 560 C510 520 480 470 470 ${FINCA_XY.y}"/>
    <path class="road" d="M455 740 C380 640 260 560 200 470 C160 380 150 250 140 105"/>
    <path class="road thin" d="M${FINCA_XY.x} ${FINCA_XY.y} C${FINCA_XY.x + 20} 340 500 300 505 268"/>
    <text class="label river-label" x="512" y="200" transform="rotate(80 512 200)">Río Torío</text>
    <text class="label river-label" x="205" y="250" transform="rotate(78 205 250)">Río Bernesga</text>
    <text class="label river-label" x="796" y="300" transform="rotate(84 796 300)">Río Porma</text>
    <text class="label region" x="40" y="58">ASTURIAS ↑</text>
    <text class="label region scale-note" x="972" y="728" text-anchor="end"></text>
    <g class="compass" transform="translate(920 640)"><circle r="30"/><path d="M0 -24 L7 0 L0 24 L-7 0Z"/><path d="M0 -24 L7 0 L-7 0Z" class="n"/><text y="-34" text-anchor="middle">N</text></g>
    <path class="route" d="" mask="url(#route-mask)"/>
    <g class="home" transform="translate(${FINCA_XY.x} ${FINCA_XY.y})">
      <circle class="pulse" r="26"/>
      <circle r="24" class="home-bg"/>
      <path d="M-15 10V-1L-8 -8L-1 -1V10M-1 10V-3H3V10M3 10V-1L10 -8L17 -1V10" transform="translate(-1 0)" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>
    </g>
  </svg>`;
}

export function initMap(reduced: boolean) {
  const map = document.getElementById('map')!;
  const chips = document.getElementById('map-chips')!;
  const card = document.getElementById('map-card')!;
  map.innerHTML = mapSVG() + '<div class="pins" id="pins"></div>';
  const pins = map.querySelector<HTMLElement>('#pins')!;
  const route = map.querySelector<SVGPathElement>('.route')!;
  const reveal = map.querySelector<SVGPathElement>('#route-reveal')!;

  let filter: Cat | 'all' = 'all';
  let selected: Place | null = null;

  const renderChips = () => {
    chips.setAttribute('aria-label', t('mapEyebrow'));
    chips.innerHTML = CATS.map((c) => `<button type="button" class="chip ${filter === c.id ? 'is-on' : ''}" data-cat="${c.id}" aria-pressed="${filter === c.id}" style="--c:${c.color}">${tr(c.label)}</button>`).join('');
  };

  const renderPins = () => {
    pins.innerHTML = PLACES.map((p) => `
      <button type="button" class="pin ${selected?.id === p.id ? 'is-on' : ''} ${filter !== 'all' && filter !== p.cat ? 'is-dim' : ''}" data-id="${p.id}"
        style="left:${p.x / 10}%;top:${p.y / 7.5}%;--c:${color(p.cat)}" aria-pressed="${selected?.id === p.id}">
        <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[p.cat]}</svg>
        <span class="pin-label">${p.name}</span>
      </button>`).join('') +
      `<span class="home-label" style="left:${FINCA_XY.x / 10}%;top:${FINCA_XY.y / 7.5}%">${t('mapHome')}</span>`;
  };

  const renderCard = () => {
    if (!selected) {
      card.innerHTML = `
        <div class="mc-empty">
          <svg viewBox="0 0 80 60" aria-hidden="true"><path d="M10 50 C20 20 40 40 50 18 S70 10 72 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 7" stroke-linecap="round"/><circle cx="10" cy="50" r="5" fill="currentColor"/><path d="M72 0 l5 9 h-10z" fill="currentColor"/></svg>
          <p class="h3">${t('mapPick')}</p>
          <ul class="mc-list">${PLACES.filter((p) => filter === 'all' || p.cat === filter).map((p) => `<li><button type="button" data-id="${p.id}" style="--c:${color(p.cat)}"><i></i>${p.name}<small>${tr(p.meta)}</small></button></li>`).join('')}</ul>
        </div>`;
      return;
    }
    const p = selected;
    const cat = CATS.find((c) => c.id === p.cat)!;
    card.innerHTML = `
      <article class="mc">
        ${p.photo ? `<div class="mc-photo"><img src="/photos/${p.photo}" alt="${p.name}" loading="lazy" decoding="async" /></div>` : ''}
        <div class="mc-body">
          <p class="chip is-on" style="--c:${cat.color}">${tr(cat.label)}</p>
          <h3 class="h3">${p.name}</h3>
          <p class="mc-meta">${tr(p.meta)}</p>
          <p>${tr(p.text)}</p>
          <button type="button" class="btn btn-link" data-back>← ${t('mapPick')}</button>
        </div>
      </article>`;
  };

  const drawRoute = (p: Place | null) => {
    if (!p) {
      route.setAttribute('d', '');
      reveal.setAttribute('d', '');
      return;
    }
    const { x: x1, y: y1 } = FINCA_XY;
    const mx = (x1 + p.x) / 2, my = (y1 + p.y) / 2;
    const dx = p.x - x1, dy = p.y - y1;
    const bend = 0.22;
    const d = `M${x1} ${y1} Q${mx - dy * bend} ${my + dx * bend} ${p.x} ${p.y}`;
    route.setAttribute('d', d);
    reveal.setAttribute('d', d);
    const len = reveal.getTotalLength();
    if (reduced) return;
    gsap.fromTo(reveal, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: Math.min(1.4, 0.4 + len / 600), ease: 'power2.inOut' });
  };

  const select = (id: string | null) => {
    selected = id ? PLACES.find((p) => p.id === id) ?? null : null;
    renderPins();
    renderCard();
    drawRoute(selected);
    if (selected && !reduced) {
      gsap.fromTo(pins.querySelector('.pin.is-on'), { scale: 0.6 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)' });
      gsap.from(card.querySelectorAll('.mc-body > *, .mc-photo'), { y: 16, opacity: 0, stagger: 0.05, duration: 0.45, ease: 'power2.out' });
    }
  };

  const render = () => {
    map.querySelector('.scale-note')!.textContent = t('mapScale');
    renderChips();
    renderPins();
    renderCard();
  };
  render();
  onLang(render);

  chips.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-cat]');
    if (!b) return;
    filter = b.dataset.cat as Cat | 'all';
    if (selected && filter !== 'all' && selected.cat !== filter) select(null);
    render();
  });
  const pickFrom = (e: Event) => {
    const el = e.target as Element;
    if (el.closest('[data-back]')) return select(null);
    const b = el.closest<HTMLButtonElement>('[data-id]');
    if (b) select(b.dataset.id === selected?.id ? null : b.dataset.id!);
  };
  pins.addEventListener('click', pickFrom);
  card.addEventListener('click', pickFrom);
}
