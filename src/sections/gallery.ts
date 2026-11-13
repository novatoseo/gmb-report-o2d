import { gsap } from 'gsap';
import { GALLERY, REVIEWS } from '../content';
import { onLang, t, tr } from '../i18n';
import { lockScroll } from '../scroll';
import { asset } from '../asset';

export function initGallery(reduced: boolean) {
  const strip = document.getElementById('strip')!;
  const box = document.getElementById('lightbox') as HTMLDialogElement;
  const shots = GALLERY;
  let idx = 0;

  // Rejilla fija: una foto grande y seis en dos filas. Todas abren el visor.
  const render = () => {
    strip.innerHTML = shots.map((g, i) => `
      <figure class="shot ${i === 0 ? 'is-lead' : ''}" data-reveal>
        <button type="button" data-i="${i}" aria-label="${tr(g.caption)}">
          <img src="${asset(`photos/${g.base}-${i === 0 ? 1200 : 800}.webp`)}" srcset="${asset(`photos/${g.base}-800.webp`)} 800w, ${asset(`photos/${g.base}-1200.webp`)} 1200w" sizes="${i === 0 ? '(max-width: 700px) 92vw, 1200px' : '(max-width: 700px) 46vw, 400px'}" alt="${tr(g.alt)}" loading="lazy" decoding="async" width="1200" height="675" />
        </button>
        <figcaption><span>${String(i + 1).padStart(2, '0')}</span> ${tr(g.caption)}</figcaption>
      </figure>`).join('');
  };
  render();
  onLang(render);

  // —— Visor a pantalla completa ——
  // Los botones se crean una vez; al pasar de foto solo cambia la figura y el foco no se pierde.
  box.innerHTML = `
    <figure><img alt="" /><figcaption></figcaption></figure>
    <button type="button" class="round lb-close">✕</button>
    <button type="button" class="round lb-prev">←</button>
    <button type="button" class="round lb-next">→</button>`;
  const img = box.querySelector('img')!;
  const cap = box.querySelector('figcaption')!;
  const show = () => {
    const g = shots[idx];
    img.src = asset(`photos/${g.base}-1200.webp`);
    img.alt = tr(g.alt);
    cap.innerHTML = `${tr(g.caption)} <span>${idx + 1} / ${shots.length}</span>`;
    box.querySelector('.lb-close')!.setAttribute('aria-label', t('close'));
    box.querySelector('.lb-prev')!.setAttribute('aria-label', t('prev'));
    box.querySelector('.lb-next')!.setAttribute('aria-label', t('next'));
    if (!reduced) gsap.fromTo(img, { scale: 0.96, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out', overwrite: true });
  };
  const step = (d: number) => {
    idx = (idx + d + shots.length) % shots.length;
    show();
  };
  strip.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-i]');
    if (!b) return;
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

export function initReviews() {
  const notes = document.getElementById('notes')!;
  const render = () => {
    notes.innerHTML = REVIEWS.map((r, i) => `
      <figure class="note n${i}" data-reveal>
        <span class="stars" aria-label="5/5">★★★★★</span>
        <blockquote>«${tr(r.text)}»</blockquote>
        <figcaption>${tr(r.who)}</figcaption>
      </figure>`).join('');
  };
  render();
  onLang(render);
}
