import '@fontsource-variable/fraunces/soft.css';
import '@fontsource-variable/fraunces/soft-italic.css';
import '@fontsource-variable/figtree';
import '@fontsource-variable/jetbrains-mono';
import 'lenis/dist/lenis.css';
import './styles/main.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CONTACT } from './content';
import { applyStatic, lang, setLang, onLang, t } from './i18n';
import { bindAnchors, initScroll } from './scroll';
import { initFx } from './fx';
import { initJourney } from './sections/journey';
import { initHouses } from './sections/houses';
import { initMap } from './sections/map';
import { initGallery, initReviews } from './sections/gallery';
import { initBooking } from './sections/booking';
import { initTuningPanel } from './live/tuning';
import { CONCEPT, initConcept } from './concept';
import { initCursor } from './cursor';

gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

applyStatic();
initScroll(reduced);
bindAnchors();

initBooking();
initJourney(reduced);
initHouses(reduced);
initMap(reduced);
initGallery(reduced);
initReviews(reduced);
initFx(reduced);
initNav();
renderContact();
initTuningPanel();
initConcept();
initCursor(reduced);

addEventListener('load', () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());

function initNav() {
  const btn = document.querySelector<HTMLButtonElement>('.menu-btn')!;
  const nav = document.getElementById('nav')!;
  const toggle = (open = btn.getAttribute('aria-expanded') !== 'true') => {
    btn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
  };
  btn.addEventListener('click', () => toggle());
  document.addEventListener('navigate', () => toggle(false));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && toggle(false));

  const langBtns = document.querySelectorAll<HTMLButtonElement>('[data-lang]');
  const mark = () => langBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang())));
  langBtns.forEach((b) => b.addEventListener('click', () => {
    setLang(b.dataset.lang as 'es' | 'en');
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }));
  mark();
  onLang(mark);

  // Enlace activo según la sección visible.
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.nav-links a[href^="#"]:not(.btn)')];
  links.forEach((a) => {
    const sec = document.querySelector(a.getAttribute('href')!);
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (st) => a.classList.toggle('is-active', st.isActive),
    });
  });
}

function renderContact() {
  const el = document.getElementById('contact')!;
  const paint = () => {
    el.innerHTML = CONCEPT
      ? `<span>Valle de Vegacervera, León</span><span class="muted">${t('contactHidden')}</span>`
      : `
    <a href="mailto:${CONTACT.email}">${CONTACT.email}</a>
    <a href="tel:${CONTACT.phoneHref}">${CONTACT.phone}</a>
    <a href="tel:${CONTACT.phone2Href}">${CONTACT.phone2}</a>
    <a href="https://wa.me/${CONTACT.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>
    <a href="${CONTACT.maps}" target="_blank" rel="noopener">${CONTACT.address}</a>
    <span class="muted">Nº Registro Turismo CyL: ${CONTACT.registro}</span>`;
  };
  paint();
  onLang(paint);
}
