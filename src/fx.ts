import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { lang, onLang } from './i18n';

/** Envuelve cada palabra de un titular para animarla. */
function split(el: HTMLElement) {
  const words = (el.textContent ?? '').trim().split(/\s+/);
  el.setAttribute('aria-label', el.textContent ?? '');
  el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true"><span>${w}</span></span>`).join(' ');
  return el.querySelectorAll<HTMLElement>('.w > span');
}

export function initFx(reduced: boolean) {
  const heads = [...document.querySelectorAll<HTMLElement>('[data-split]')];
  const resplit = () => heads.forEach((h) => split(h));

  if (reduced) {
    document.documentElement.classList.add('reduced');
  } else {
    heads.forEach((h) => {
      const parts = split(h);
      gsap.from(parts, {
        yPercent: 110,
        rotate: 4,
        duration: 1,
        ease: 'power4.out',
        stagger: 0.06,
        scrollTrigger: { trigger: h, start: 'top 85%', once: true },
      });
    });
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%',
      once: true,
      onEnter: (els) => gsap.fromTo(els, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: 'power3.out', overwrite: true }),
    });
  }
  onLang(resplit);

  // Contadores de la franja de datos.
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const dec = Number(el.dataset.decimals ?? 0);
    const suffix = el.dataset.suffix ?? '';
    const paint = (v: number) => (el.textContent = v.toLocaleString(lang(), { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix);
    paint(target);
    onLang(() => paint(target));
    if (reduced) return;
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => gsap.to(o, { v: target, duration: 1.6, ease: 'power2.out', onUpdate: () => { paint(o.v); } }),
    });
    paint(0);
  });
}
