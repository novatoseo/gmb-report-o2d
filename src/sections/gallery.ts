import { gsap } from 'gsap';
import { GALLERY, REVIEWS, type Shot } from '../content';
import { onLang, t, tr } from '../i18n';
import { lockScroll } from '../scroll';

export function initGallery(reduced: boolean) {
  const strip = document.getElementById('strip')!;
  const chips = document.getElementById('season-chips')!;
  const box = document.getElementById('lightbox') as HTMLDialogElement;
  let season: Shot['season'] | 'all' = 'all';
  let shots = GALLERY;
  let idx = 0;

  const render = () => {
    chips.setAttribute('aria-label', t('galleryEyebrow'));
    chips.innerHTML = (['all', 'autumn', 'winter'] as const).map((s) =>
      `<button type="button" class="chip ${season === s ? 'is-on' : ''}" aria-pressed="${season === s}" data-s="${s}" style="--c:${s === 'winter' ? '#2b6596' : s === 'autumn' ? '#a3421e' : 'var(--ink)'}">${t(s === 'all' ? 'allSeasons' : s)}</button>`).join('');
    shots = GALLERY.filter((g) => season === 'all' || g.season === season);
    strip.innerHTML = shots.map((g, i) => `
      <figure class="shot ${g.season}">
        <button type="button" data-i="${i}" aria-label="${tr(g.caption)}">
          <img src="/photos/${g.base}-800.webp" srcset="/photos/${g.base}-800.webp 800w, /photos/${g.base}-1200.webp 1200w" sizes="(max-width: 700px) 85vw, 46vw" alt="${tr(g.alt)}" loading="lazy" decoding="async" width="1200" height="675" />
        </button>
        <figcaption><i aria-hidden="true">${g.season === 'winter' ? '❄' : '❦'}</i> ${tr(g.caption)}</figcaption>
      </figure>`).join('');
    strip.scrollLeft = 0;
    if (!reduced) gsap.from(strip.querySelectorAll('.shot'), { x: 60, opacity: 0, stagger: 0.06, duration: 0.7, ease: 'power3.out' });
  };
  render();
  onLang(render);

  chips.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-s]');
    if (!b) return;
    season = b.dataset.s as typeof season;
    render();
  });

  const page = (dir: number) => strip.scrollBy({ left: dir * strip.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
  document.getElementById('g-prev')!.addEventListener('click', () => page(-1));
  document.getElementById('g-next')!.addEventListener('click', () => page(1));

  // Arrastrar con el ratón en escritorio.
  let down = false, startX = 0, startLeft = 0, moved = 0;
  strip.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    down = true;
    moved = 0;
    startX = e.clientX;
    startLeft = strip.scrollLeft;
    strip.classList.add('is-drag');
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    moved = Math.abs(e.clientX - startX);
    strip.scrollLeft = startLeft - (e.clientX - startX);
  });
  window.addEventListener('pointerup', () => {
    down = false;
    strip.classList.remove('is-drag');
  });

  // —— Visor a pantalla completa ——
  const show = () => {
    const g = shots[idx];
    box.innerHTML = `
      <figure>
        <img src="/photos/${g.base}-1200.webp" alt="${tr(g.alt)}" />
        <figcaption>${tr(g.caption)} <span>${idx + 1} / ${shots.length}</span></figcaption>
      </figure>
      <button type="button" class="round lb-close" aria-label="${t('close')}">✕</button>
      <button type="button" class="round lb-prev" aria-label="${t('prev')}">←</button>
      <button type="button" class="round lb-next" aria-label="${t('next')}">→</button>`;
    if (!reduced) gsap.from(box.querySelector('img'), { scale: 0.96, opacity: 0, duration: 0.4, ease: 'power2.out' });
  };
  const step = (d: number) => {
    idx = (idx + d + shots.length) % shots.length;
    show();
  };
  strip.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-i]');
    if (!b || moved > 6) return;
    idx = Number(b.dataset.i);
    show();
    box.showModal();
    lockScroll(true);
  });
  box.addEventListener('close', () => lockScroll(false));
  box.addEventListener('click', (e) => {
    const el = e.target as Element;
    if (el === box || el.closest('.lb-close')) box.close();
    else if (el.closest('.lb-prev')) step(-1);
    else if (el.closest('.lb-next')) step(1);
  });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });
  let tx = 0;
  box.addEventListener('touchstart', (e) => (tx = e.touches[0].clientX), { passive: true });
  box.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  });
}

export function initReviews(reduced: boolean) {
  const notes = document.getElementById('notes')!;
  const render = () => {
    notes.innerHTML = REVIEWS.map((r, i) => `
      <figure class="note n${i}" data-reveal>
        <span class="tape" aria-hidden="true"></span>
        <span class="stars" aria-label="5/5">★★★★★</span>
        <blockquote>«${tr(r.text)}»</blockquote>
        <figcaption>${tr(r.who)}</figcaption>
      </figure>`).join('');
  };
  render();
  onLang(render);
  if (reduced) return;
  notes.addEventListener('pointermove', (e) => {
    const n = (e.target as Element).closest<HTMLElement>('.note');
    if (!n) return;
    const r = n.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(n, { rotateY: x * 10, rotateX: -y * 10, duration: 0.4, ease: 'power2.out' });
  });
  notes.addEventListener('pointerout', (e) => {
    const n = (e.target as Element).closest<HTMLElement>('.note');
    if (n && !n.contains(e.relatedTarget as Node)) gsap.to(n, { rotateY: 0, rotateX: 0, duration: 0.6 });
  });
}
