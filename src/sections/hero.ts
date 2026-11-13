import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LivePhoto } from '../live/livephoto';
import { scene } from '../live/scenes';
import { madridHour } from '../time';

/** Noche (0–1) que corresponde a la hora real en el valle. */
const nightFor = (h: number) => (h >= 21.5 || h < 6.5 ? 1 : h >= 20 ? (h - 20) / 1.5 : 0);

export function initHero(reduced: boolean) {
  const hero = document.getElementById('inicio')!;
  const range = document.getElementById('dial-range') as HTMLInputElement;
  const play = document.getElementById('dial-play')!;
  const nav = document.getElementById('nav')!;

  const sc = scene('atardecer');
  const live = new LivePhoto(hero, sc, { pointer: true, label: 'Las tres casas de La Finca del Valle al atardecer, con las ventanas encendidas frente al pueblo de Vegacervera' });
  nav.classList.add('on-dark');

  const set = (n: number) => {
    sc.night = n * 0.9;
    sc.glow = 0.55 + n * 0.6;
    sc.sun = [0, 0.09, 0.9 * (1 - n)];
    range.value = String(n);
    hero.style.setProperty('--night', n.toFixed(3));
    live.redraw();
  };
  set(nightFor(madridHour()));

  let tween: gsap.core.Tween | null = null;
  const stop = () => {
    tween?.kill();
    tween = null;
    play.classList.remove('is-playing');
  };
  range.addEventListener('input', () => {
    stop();
    set(Number(range.value));
  });
  play.addEventListener('click', () => {
    if (tween) return stop();
    const o = { n: sc.night ?? 0 };
    play.classList.add('is-playing');
    tween = gsap.to(o, { n: o.n > 0.5 ? 0 : 1, duration: reduced ? 0.01 : 4, ease: 'sine.inOut', onUpdate: () => set(o.n), onComplete: stop });
  });

  if (!reduced) {
    // Al bajar, la cámara se acerca a las casas (dolly con profundidad real).
    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (st) => {
        sc.dolly = 0.1 + st.progress * 0.35;
        sc.zoom = 1.06 + st.progress * 0.12;
      },
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

  ScrollTrigger.create({
    trigger: hero,
    start: 'bottom 80px',
    onEnter: () => nav.classList.add('solid'),
    onLeaveBack: () => nav.classList.remove('solid'),
  });
}
