import { gsap } from 'gsap';
import type { Vector3 } from 'three';
import { CATS, FINCA, PLACES, type Cat, type Place } from '../content';
import { onLang, t, tr } from '../i18n';
import type { Terrain3D } from '../map3d/terrain';

const ICONS: Record<Cat, string> = {
  trail: '<path d="M7 21l3-8 3 3 4-11M5 8l2-2 2 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  nature: '<path d="M12 3c5 3 7 7 5 11-1.5 3-5 4-5 7M12 21c0-3-3.5-4-5-7-2-4 0-8 5-11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  adventure: '<path d="M3 19l6-10 4 6 2-3 6 7z" fill="currentColor"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  food: '<path d="M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M16 3c-2 2-2 6 0 8v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  arrive: '<rect x="6" y="4" width="12" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 20l2-3M16 20l-2-3M6 11h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};
const color = (c: Cat) => CATS.find((x) => x.id === c)!.color;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function initMap(reduced: boolean) {
  const map = document.getElementById('map')!;
  const chips = document.getElementById('map-chips')!;
  const card = document.getElementById('map-card')!;
  let filter: Cat | 'all' = 'all';
  let selected: Place | null = null;
  let engine: Terrain3D | null = null;
  const anchors = new Map<string, Vector3>();
  let home: Vector3 | null = null;

  map.innerHTML = `
    <div class="pins" id="pins"></div>
    <div class="map-ui">
      <button type="button" class="round" data-zoom="0.7"></button>
      <button type="button" class="round" data-zoom="1.4"></button>
      <button type="button" class="round map-home" data-reset></button>
    </div>
    <p class="map-hint"></p>
    <p class="map-credit"></p>
    <div class="map-loading" aria-hidden="true"><span></span></div>`;
  const pins = map.querySelector<HTMLElement>('#pins')!;

  const renderChips = () => {
    chips.setAttribute('aria-label', t('mapEyebrow'));
    chips.innerHTML = CATS.map((c) => `<button type="button" class="chip ${filter === c.id ? 'is-on' : ''}" data-cat="${c.id}" aria-pressed="${filter === c.id}" style="--c:${c.color}">${tr(c.label)}</button>`).join('');
  };

  const renderPins = () => {
    pins.innerHTML = PLACES.map((p) => `
      <button type="button" class="pin ${selected?.id === p.id ? 'is-on' : ''} ${filter !== 'all' && filter !== p.cat ? 'is-dim' : ''}" data-id="${p.id}" style="--c:${color(p.cat)}" aria-pressed="${selected?.id === p.id}">
        <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[p.cat]}</svg>
        <span class="pin-label">${p.name}</span>
      </button>`).join('') + `<span class="home-label"><i></i>${t('mapHome')}</span>`;
    place();
  };

  const renderUi = () => {
    const [zin, zout, reset] = map.querySelectorAll<HTMLButtonElement>('.map-ui button');
    zin.textContent = '+';
    zin.setAttribute('aria-label', t('zoomIn'));
    zout.textContent = '−';
    zout.setAttribute('aria-label', t('zoomOut'));
    reset.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" fill="currentColor"/></svg>';
    reset.setAttribute('aria-label', t('mapReset'));
    reset.title = t('mapReset');
    map.querySelector('.map-hint')!.textContent = matchMedia('(hover: none)').matches ? t('mapHintTouch') : t('mapHint');
    map.querySelector('.map-credit')!.textContent = t('mapCredit');
  };

  const renderCard = () => {
    if (!selected) {
      card.innerHTML = `
        <div class="mc-empty">
          <p class="h3">${t('mapPick')}</p>
          ${map.classList.contains('no-gl') ? `<p class="fine">${t('mapNoGL')}</p>` : ''}
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
    if (!reduced) gsap.from(card.querySelectorAll('.mc-body > *, .mc-photo'), { y: 16, opacity: 0, stagger: 0.05, duration: 0.45, ease: 'power2.out' });
  };

  // Coloca los pines HTML sobre el mapa 3D.
  const place = () => {
    if (!engine) return;
    const r = map.getBoundingClientRect();
    pins.querySelectorAll<HTMLElement>('.pin').forEach((el) => {
      const a = anchors.get(el.dataset.id!);
      const s = a && engine!.project(a);
      const ok = !!s && s.x > -20 && s.y > -20 && s.x < r.width + 20 && s.y < r.height + 20;
      el.style.visibility = ok ? 'visible' : 'hidden';
      if (ok) {
        el.style.left = `${s!.x}px`;
        el.style.top = `${s!.y}px`;
      }
    });
    const hl = pins.querySelector<HTMLElement>('.home-label');
    const hs = home && engine.project(home);
    if (hl && hs) {
      hl.style.left = `${hs.x}px`;
      hl.style.top = `${hs.y}px`;
    }
  };

  const select = (id: string | null) => {
    selected = id ? PLACES.find((p) => p.id === id) ?? null : null;
    renderPins();
    renderCard();
    if (!engine || !home) return;
    if (!selected) {
      engine.hideTrails();
      engine.overview();
      return;
    }
    const p = selected;
    if (p.trail) {
      const res = engine.showTrail(p.trail);
      if (res) engine.flyTo(res.center, Math.max(4.2, res.size * 1.6), { azimuth: 0.25, polar: 0.7 });
      return;
    }
    const uv = engine.uv(p.lat, p.lon);
    const end = engine.showRoute(uv);
    const along = Math.atan2(end.x - home.x, end.z - home.z);
    if (!engine.inside(...uv)) {
      // Fuera del mapa (León, Riaño): desde la casa, mirando hacia allí.
      engine.flyTo(home.clone().lerp(end, 0.35), 14, { azimuth: along + Math.PI, polar: 1.05 });
      return;
    }
    const mid = home.clone().lerp(end, 0.5);
    const sep = home.distanceTo(end);
    // Se mira la ruta de lado y desde arriba, para ver la casa y el destino a la vez.
    engine.flyTo(mid, Math.max(4.5, sep * 1.9), { azimuth: along + Math.PI / 2 * (Math.cos(along) > 0 ? 1 : -1), polar: 0.62 });
  };

  const render = () => {
    renderChips();
    renderPins();
    renderCard();
    renderUi();
  };
  render();
  onLang(render);

  // El mapa 3D se carga al acercarse a la sección.
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    map.classList.add('is-loading');
    const { Terrain3D } = await import('../map3d/terrain');
    const eng = new Terrain3D(map, reduced);
    const ok = await eng.init().catch((err) => {
      console.warn('[mapa 3D]', err);
      return false;
    });
    map.classList.remove('is-loading');
    if (!ok) {
      map.classList.add('no-gl');
      renderCard();
      return;
    }
    engine = eng;
    if (location.search.includes('gl=force')) (window as unknown as { __map: Terrain3D }).__map = eng;
    home = eng.world(...eng.uv(FINCA.lat, FINCA.lon), 0.05);
    for (const p of PLACES) {
      const [u, v] = eng.uv(p.lat, p.lon);
      // Los lugares fuera del mapa (León, Riaño) se señalan en el borde.
      anchors.set(p.id, eng.world(clamp(u, 0.01, 0.99), clamp(v, 0.01, 0.99), 0.05));
    }
    eng.onRender = place;
    map.classList.add('is-ready');
    place();
  }, { rootMargin: '60% 0px' });
  io.observe(map);

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
  map.querySelector('.map-ui')!.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button');
    if (!b || !engine) return;
    if (b.dataset.zoom) engine.zoom(Number(b.dataset.zoom));
    else select(null);
  });
}
