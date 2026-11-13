import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { fmtHour, madridHour, phaseOf, wrap } from '../scene/palette';
import { Valley } from '../scene/valley';
import { onLang, t } from '../i18n';
import { scrollToId } from '../scroll';

export function initHero(reduced: boolean) {
  const hero = document.getElementById('inicio')!;
  const valley = new Valley(hero, { id: 'hv', label: 'Ilustración del Valle de Vegacervera con las tres casas', parallax: true });
  const range = document.getElementById('dial-range') as HTMLInputElement;
  const timeEl = document.getElementById('dial-time')!;
  const phaseEl = document.getElementById('dial-phase')!;
  const play = document.getElementById('dial-play')!;
  const nav = document.getElementById('nav')!;

  let hour = madridHour();
  let touched = false;
  let playing: gsap.core.Tween | null = null;

  const paint = () => {
    phaseEl.textContent = t(`phase.${phaseOf(hour)}`);
    timeEl.textContent = fmtHour(hour);
  };
  valley.onFrame = (f) => {
    nav.classList.toggle('on-dark', f.dark);
  };
  const set = (h: number) => {
    hour = wrap(h);
    valley.setHour(hour);
    range.value = String(hour);
    paint();
  };
  set(hour);
  onLang(paint);

  range.addEventListener('input', () => {
    touched = true;
    stop();
    set(Number(range.value));
  });

  // Mientras nadie toque el dial, el valle sigue la hora real de Vegacervera.
  setInterval(() => {
    if (!touched && !playing) set(madridHour());
  }, 60_000);

  const stop = () => {
    playing?.kill();
    playing = null;
    play.classList.remove('is-playing');
  };
  play.addEventListener('click', () => {
    if (playing) return stop();
    touched = true;
    const o = { h: hour };
    play.classList.add('is-playing');
    playing = gsap.to(o, {
      h: hour + 24,
      duration: 14,
      ease: 'none',
      onUpdate: () => set(o.h),
      onComplete: stop,
    });
  });

  // Easter eggs: las ovejas saltan; las casas llevan a su sección.
  hero.addEventListener('click', (e) => {
    const target = e.target as Element;
    const s = target.closest('.sheep');
    if (s) return hop(s as SVGGElement, reduced);
    if (target.closest('.finca')) scrollToId('casas');
  });

  if (!reduced) {
    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (st) => valley.setShift(st.progress * hero.offsetHeight),
    });
    gsap.to('.hero-copy, .sky-dial, .scroll-hint, .discount', {
      yPercent: -30,
      opacity: 0,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: '70% top', scrub: true },
    });
    gsap.from('.hero-copy > *', { y: 40, duration: 1.1, stagger: 0.12, ease: 'power3.out' });
    gsap.from('.hero-copy .eyebrow, .hero-copy .actions', { opacity: 0, duration: 0.9, delay: 0.2 });
    gsap.from('.sky-dial, .discount', { y: 20, opacity: 0, duration: 0.9, delay: 0.8, ease: 'power2.out' });
  }

  // La barra de navegación se vuelve sólida al salir del hero.
  ScrollTrigger.create({
    trigger: hero,
    start: 'bottom 80px',
    onEnter: () => nav.classList.add('solid'),
    onLeaveBack: () => nav.classList.remove('solid'),
  });
}

function hop(sheep: SVGGElement, reduced: boolean) {
  const body = sheep.querySelector('.sheep-hop')!;
  const m = sheep.transform.baseVal.consolidate()?.matrix;
  if (!m) return;
  const bubble = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  bubble.setAttribute('class', 'baa');
  bubble.setAttribute('transform', `translate(${m.e} ${m.f - 38})`);
  bubble.innerHTML = `<rect x="-26" y="-16" width="52" height="22" rx="11"/><text y="0" text-anchor="middle">${t('sheep')}</text>`;
  sheep.parentNode!.appendChild(bubble);
  if (reduced) {
    setTimeout(() => bubble.remove(), 1200);
    return;
  }
  gsap.timeline()
    .to(body, { y: -16, duration: 0.18, ease: 'power2.out' })
    .to(body, { y: 0, duration: 0.32, ease: 'bounce.out' });
  gsap.fromTo(bubble, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25 });
  gsap.to(bubble, { opacity: 0, y: -10, delay: 1, duration: 0.4, onComplete: () => bubble.remove() });
}
