import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let lenis: Lenis | null = null;

/** Scroll suave (Lenis) sincronizado con ScrollTrigger. Sin él si se pide menos movimiento. */
export function initScroll(reduced: boolean) {
  if (reduced) return;
  lenis = new Lenis({ autoRaf: false, lerp: 0.11 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis!.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

export function scrollToId(id: string, offset = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.4 });
  else el.scrollIntoView({ behavior: 'auto' });
}

export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y, { duration: 1.2 });
  else window.scrollTo(0, y);
}

export const lockScroll = (on: boolean) => {
  if (lenis) (on ? lenis.stop() : lenis.start());
  document.documentElement.classList.toggle('locked', on);
};

/** Enlaces internos (#id) con scroll suave. */
export function bindAnchors() {
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href')!.slice(1);
    if (!id || !document.getElementById(id)) return;
    e.preventDefault();
    scrollToId(id);
    history.replaceState(null, '', `#${id}`);
    document.dispatchEvent(new CustomEvent('navigate'));
  });
}
