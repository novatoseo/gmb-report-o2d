import { gsap } from 'gsap';
import { HOUSES, type House } from '../content';
import { onLang, t, tr } from '../i18n';
import { Valley } from '../scene/valley';
import { lockScroll, scrollToId } from '../scroll';
import { selectHouse } from './booking';

// Zonas clicables de cada casa sobre la fachada (en % del viewBox 560 540 480 260).
const HITS: Record<House['id'], { l: number; t: number; w: number; h: number }> = {
  maelo: { l: 16.5, t: 20.4, w: 22.7, h: 41.9 },
  brana: { l: 39.6, t: 32.3, w: 21.2, h: 30 },
  teleno: { l: 60.8, t: 20.4, w: 22.7, h: 41.9 },
};

export function initHouses(reduced: boolean) {
  const facade = document.getElementById('facade')!;
  const hits = document.getElementById('facade-hits')!;
  const cards = document.getElementById('house-cards')!;
  const dialog = document.getElementById('house-dialog') as HTMLDialogElement;

  const valley = new Valley(facade, {
    id: 'fv',
    viewBox: '560 540 480 260',
    preserve: 'xMidYMid meet',
    label: 'Fachada de las tres casas: Maelo a la izquierda, Braña en el centro y Teleno a la derecha',
    lazy: true,
  });
  valley.setHour(18.6);

  const unitEl = (id: string) => facade.querySelector<SVGGElement>(`.unit-${id}`);
  const light = (id: string | null) => {
    facade.querySelectorAll('.unit').forEach((u) => u.classList.toggle('is-on', (u as SVGGElement).dataset.unit === id));
    facade.classList.toggle('has-on', !!id);
    cards.querySelectorAll<HTMLElement>('.house-card').forEach((c) => c.classList.toggle('is-on', c.dataset.id === id));
  };

  const render = () => {
    hits.innerHTML = HOUSES.map((h) => {
      const p = HITS[h.id];
      return `<button type="button" class="hit" data-id="${h.id}" style="left:${p.l}%;top:${p.t}%;width:${p.w}%;height:${p.h}%">
        <span class="hit-tag"><b>${h.name}</b><span class="hit-price"> ${t('from')} ${h.priceFrom} €</span></span>
        <span class="sr">${t('enter')} ${h.name}</span>
      </button>`;
    }).join('');
    cards.innerHTML = HOUSES.map((h) => `
      <article class="house-card" data-id="${h.id}" data-reveal>
        <div class="hc-photo"><img src="/photos/${h.photos[0].src}" alt="${tr(h.photos[0].alt)}" loading="lazy" decoding="async" width="1920" height="1080" /></div>
        <p class="eyebrow">${tr(h.position)}</p>
        <h3 class="h3">${h.name}</h3>
        <p>${tr(h.tagline)}</p>
        <ul class="hc-specs"><li>${h.area} m²</li><li>${tr(h.guests)}</li><li>${tr(h.bedrooms)}</li></ul>
        <div class="hc-foot">
          <p class="price"><small>${t('from')}</small> <b>${h.priceFrom} €</b><small> / ${t('night')}</small></p>
          <button type="button" class="btn btn-ink" data-id="${h.id}">${t('enter')} ${h.name}</button>
        </div>
      </article>`).join('');
  };
  render();
  onLang(render);

  const over = (e: Event) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-id]');
    light(el?.dataset.id ?? null);
  };
  for (const root of [hits, cards]) {
    root.addEventListener('pointerover', over);
    root.addEventListener('focusin', over);
    root.addEventListener('pointerleave', () => light(null));
    root.addEventListener('focusout', () => light(null));
    root.addEventListener('click', (e) => {
      const b = (e.target as Element).closest<HTMLButtonElement>('button[data-id]');
      if (b) open(b.dataset.id as House['id'], b);
    });
  }

  // —— Ficha de cada casa ——
  let current: House | null = null;
  let slide = 0;

  const fill = (h: House) => {
    dialog.innerHTML = `
      <div class="hd-inner" data-lenis-prevent>
        <button type="button" class="round hd-close" aria-label="${t('close')}">✕</button>
        <div class="hd-gallery">
          <div class="hd-track">${h.photos.map((p, i) => `<img src="/photos/${p.src}" alt="${tr(p.alt)}" ${i ? 'loading="lazy"' : ''} decoding="async" />`).join('')}</div>
          <div class="hd-nav">
            <button type="button" class="round" data-dir="-1" aria-label="${t('prev')}">←</button>
            <span class="hd-count" aria-live="polite"></span>
            <button type="button" class="round" data-dir="1" aria-label="${t('next')}">→</button>
          </div>
        </div>
        <div class="hd-info">
          <p class="eyebrow">${tr(h.position)}</p>
          <h2 id="hd-title" class="display-sm">${h.name}</h2>
          <p class="tagline">${tr(h.tagline)}</p>
          <p>${tr(h.description)}</p>
          <dl class="specs">
            <div><dt>${t('area')}</dt><dd>${h.area} m²</dd></div>
            <div><dt>${t('guests')}</dt><dd>${tr(h.guests)}</dd></div>
            <div><dt>${t('rooms')}</dt><dd>${tr(h.bedrooms)}</dd></div>
            <div><dt>${t('beds')}</dt><dd>${tr(h.beds)}</dd></div>
            <div><dt>${t('baths')}</dt><dd>${tr(h.baths)}</dd></div>
          </dl>
          <p class="extras">${t('extras')}</p>
          <div class="hd-foot">
            <p class="price"><small>${t('from')}</small> <b>${h.priceFrom} €</b><small> / ${t('night')}</small></p>
            <button type="button" class="btn btn-sun" data-book="${h.id}">${t('bookThis')} ${h.name}</button>
          </div>
        </div>
      </div>`;
    slide = 0;
    count();
  };

  const track = () => dialog.querySelector<HTMLElement>('.hd-track')!;
  const count = () => {
    const c = dialog.querySelector('.hd-count');
    if (c && current) c.textContent = `${slide + 1} / ${current.photos.length}`;
  };
  const go = (dir: number) => {
    if (!current) return;
    slide = (slide + dir + current.photos.length) % current.photos.length;
    const tr = track();
    tr.scrollTo({ left: slide * tr.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
    count();
  };

  function open(id: House['id'], from?: HTMLElement) {
    current = HOUSES.find((h) => h.id === id)!;
    fill(current);
    dialog.showModal();
    lockScroll(true);
    if (reduced) return;
    const r = from?.getBoundingClientRect();
    const x = r ? r.left + r.width / 2 : innerWidth / 2;
    const y = r ? r.top + r.height / 2 : innerHeight / 2;
    gsap.fromTo(dialog, { clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(150% at ${x}px ${y}px)`, duration: 0.9, ease: 'power3.inOut' });
    gsap.from(dialog.querySelectorAll('.hd-info > *'), { y: 24, opacity: 0, stagger: 0.05, duration: 0.6, delay: 0.35, ease: 'power2.out' });
    const u = unitEl(id);
    if (u) gsap.fromTo(u, { scale: 1 }, { scale: 1.04, transformOrigin: '50% 100%', yoyo: true, repeat: 1, duration: 0.25 });
  }

  const close = () => {
    if (!dialog.open) return;
    dialog.close();
  };
  dialog.addEventListener('close', () => {
    lockScroll(false);
    gsap.set(dialog, { clearProps: 'clipPath' });
  });
  dialog.addEventListener('click', (e) => {
    const el = e.target as Element;
    if (el === dialog || el.closest('.hd-close')) return close();
    const nav = el.closest<HTMLButtonElement>('[data-dir]');
    if (nav) return go(Number(nav.dataset.dir));
    const book = el.closest<HTMLButtonElement>('[data-book]');
    if (book) {
      selectHouse(book.dataset.book as House['id']);
      close();
      scrollToId('reservar');
    }
  });
  dialog.addEventListener('scroll', (e) => {
    const el = e.target as HTMLElement;
    if (!el.classList?.contains('hd-track')) return;
    const s = Math.round(el.scrollLeft / el.clientWidth);
    if (s !== slide) {
      slide = s;
      count();
    }
  }, { capture: true, passive: true });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  });
  onLang(() => {
    if (dialog.open && current) fill(current);
  });
}
