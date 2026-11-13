import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HOUSES, JOURNEY } from '../content';
import { onLang, t, tr } from '../i18n';
import { asset } from '../asset';
import type { Journey } from '../journey/journey';
import { Ambience } from '../journey/sound';

// Rangos de scroll de cada texto (deben coincidir con CHAPTERS en journey/journey.ts).
const BLOCKS: { id: string; from: number; to: number; pos: 'center' | 'left' | 'right' | 'top'; bg: string }[] = [
  { id: 'intro', from: -1, to: 0.065, pos: 'center', bg: 'atardecer' },
  { id: 'descent', from: 0.1, to: 0.22, pos: 'left', bg: 'amanecer' },
  { id: 'house', from: 0.29, to: 0.355, pos: 'left', bg: 'otono' },
  { id: 'unit-0', from: 0.365, to: 0.393, pos: 'right', bg: 'fachada' },
  { id: 'unit-1', from: 0.393, to: 0.418, pos: 'right', bg: 'fachada' },
  { id: 'unit-2', from: 0.418, to: 0.445, pos: 'right', bg: 'fachada' },
  { id: 'sunrise', from: 0.475, to: 0.535, pos: 'left', bg: 'amanecer' },
  { id: 'golden', from: 0.545, to: 0.605, pos: 'left', bg: 'camino' },
  { id: 'trail', from: 0.65, to: 0.76, pos: 'left', bg: 'otono' },
  { id: 'winter', from: 0.785, to: 0.865, pos: 'center', bg: 'invierno' },
  { id: 'night', from: 0.92, to: 0.957, pos: 'top', bg: 'atardecer' },
  { id: 'outro', from: 0.972, to: 2, pos: 'center', bg: 'invierno' },
];
const NAMES: Record<string, { es: string; en: string }> = {
  intro: { es: 'Amanecer sobre las nubes', en: 'Dawn above the clouds' },
  descent: { es: 'El descenso', en: 'The descent' },
  house: { es: 'La casa', en: 'The house' },
  'unit-0': { es: 'Maelo', en: 'Maelo' },
  'unit-1': { es: 'Braña', en: 'Braña' },
  'unit-2': { es: 'Teleno', en: 'Teleno' },
  sunrise: { es: 'Amanecer', en: 'Sunrise' },
  golden: { es: 'Hora dorada', en: 'Golden hour' },
  trail: { es: 'La ruta', en: 'The trail' },
  winter: { es: 'Invierno', en: 'Winter' },
  night: { es: 'Noche', en: 'Night' },
  outro: { es: 'El valle, hecho de luz', en: 'The valley, made of light' },
};

// Efecto «decodificar»: cada carácter pasa por símbolos al azar antes de quedarse fijo.
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·/°#%&*+=<>';
function scramble(nodes: HTMLElement[], delay = 0, step = 0.022) {
  const finals = nodes.map((n) => n.dataset.ch ?? (n.dataset.ch = n.textContent ?? ''));
  const t0 = performance.now() + delay * 1000;
  const tick = () => {
    const t = (performance.now() - t0) / 1000;
    let done = true;
    nodes.forEach((n, i) => {
      const reveal = i * step + 0.28;
      if (finals[i] === ' ' || t >= reveal) {
        if (n.textContent !== finals[i]) n.textContent = finals[i];
      } else {
        done = false;
        if (t > i * step * 0.5) n.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
    });
    if (!done) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
const charSpans = (el: Element) => {
  const text = el.textContent ?? '';
  el.setAttribute('aria-label', text);
  el.innerHTML = text.split(' ').map((w) => `<span class="jw" aria-hidden="true">${[...w].map((ch) => `<span class="jc">${ch}</span>`).join('')}</span>`).join(' ');
};

const fmt = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(3)}° ${v >= 0 ? pos : neg}`;

export function initJourney(reduced: boolean) {
  const section = document.getElementById('inicio')!;
  const sticky = section.querySelector<HTMLElement>('.j-sticky')!;
  const wrap = section.querySelector<HTMLElement>('.j-chapters')!;
  const hud = section.querySelector<HTMLElement>('.j-hud')!;
  const bar = section.querySelector<HTMLElement>('.j-progress i')!;
  const pre = section.querySelector<HTMLElement>('.j-pre')!;
  const preCount = pre.querySelector('b')!;
  const preBar = pre.querySelector<HTMLElement>('.j-pre-bar i')!;
  const soundBtn = section.querySelector<HTMLButtonElement>('.j-sound')!;
  const sound = new Ambience();
  const paintSound = () => {
    soundBtn.setAttribute('aria-pressed', String(sound.on));
    soundBtn.querySelector('.j-sound-label')!.textContent = t(sound.on ? 'soundOff' : 'soundOn');
    soundBtn.classList.toggle('is-on', sound.on);
  };
  soundBtn.addEventListener('click', async () => {
    await sound.toggle(!sound.on);
    paintSound();
  });
  onLang(paintSound);
  // Contador de carga que sube con suavidad hasta el progreso real.
  const preState = { v: 0 };
  const setPre = (f: number) => gsap.to(preState, { v: f * 100, duration: 0.6, ease: 'power1.out', onUpdate: () => {
    preCount.textContent = String(Math.round(preState.v)).padStart(3, '0');
    preBar.style.transform = `scaleX(${preState.v / 100})`;
  } });
  const nav = document.getElementById('nav')!;
  nav.classList.add('on-dark');
  if (section.getBoundingClientRect().bottom > 0) nav.classList.add('in-journey');

  const blockHtml = (id: string) => {
    if (id.startsWith('unit-')) {
      const h = HOUSES[Number(id.slice(5))];
      return `<p class="j-eyebrow">${tr(h.position)}</p><h2 class="j-title">${h.name}</h2><p class="j-text">${tr(h.tagline)} ${h.area} m² · ${tr(h.guests)} · ${t('from')} ${h.priceFrom} € / ${t('night')}</p>`;
    }
    const c = JOURNEY[id];
    const tag = id === 'intro' ? 'h1' : 'h2';
    const ctas = id === 'intro' || id === 'outro'
      ? `<div class="j-actions"><a class="btn btn-sun" href="#reservar">${t('heroCta')}</a><a class="btn btn-ghost" href="#casas">${t('heroCta2')}</a></div>`
      : '';
    return `<p class="j-eyebrow">${tr(c.eyebrow)}</p><${tag} class="j-title${id === 'intro' ? ' j-title-xl' : ''}">${tr(c.title)}</${tag}>${c.text ? `<p class="j-text">${tr(c.text)}</p>` : ''}${ctas}`;
  };

  const render = () => {
    wrap.innerHTML = BLOCKS.map((b) => `<article class="j-chap is-${b.pos}" data-id="${b.id}" style="--bg:url(${asset(`live/${b.bg}-1200.webp`)})">${blockHtml(b.id)}</article>`).join('');
    // Cada letra del título por separado, para animarlas.
    wrap.querySelectorAll<HTMLElement>('.j-title, .j-eyebrow').forEach(charSpans);
    active = '';
  };
  let active = '';
  render();

  let isStatic = false;
  let trigger: ScrollTrigger | null = null;
  const staticMode = (why: string) => {
    isStatic = true;
    trigger?.kill();
    gsap.killTweensOf(section.querySelectorAll('.j-chap, .j-chap *'));
    render(); // capítulos nuevos, sin estado de animación
    section.classList.add('is-static');
    pre.hidden = true;
    soundBtn.hidden = true;
    section.querySelector('.j-fallback')!.textContent = why ? t('journeyFallback') : '';
    ScrollTrigger.refresh();
  };

  if (reduced) {
    staticMode('');
    onLang(render);
    return;
  }

  const show = (id: string) => {
    if (id === active) return;
    const prev = wrap.querySelector<HTMLElement>(`.j-chap[data-id="${active}"]`);
    const next = wrap.querySelector<HTMLElement>(`.j-chap[data-id="${id}"]`);
    active = id;
    if (prev) {
      prev.classList.remove('is-on');
      gsap.to(prev, { autoAlpha: 0, y: -20, duration: 0.4, ease: 'power2.in', overwrite: true });
    }
    if (!next) return;
    next.classList.add('is-on');
    sound.tick();
    gsap.fromTo(next, { autoAlpha: 0, y: 0 }, { autoAlpha: 1, duration: 0.2, overwrite: true });
    const title = [...next.querySelectorAll<HTMLElement>('.j-title .jc')];
    const eyebrow = [...next.querySelectorAll<HTMLElement>('.j-eyebrow .jc')];
    gsap.fromTo(title, { yPercent: 60, opacity: 0, filter: 'blur(8px)' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7, stagger: 0.018, ease: 'expo.out' });
    scramble(title, 0, 0.022);
    scramble(eyebrow, 0.05, 0.012);
    gsap.fromTo(next.querySelectorAll('.j-text, .j-actions'), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.08, delay: 0.3, ease: 'power2.out' });
  };

  let engine: Journey | null = null;
  const update = (p: number) => {
    if (isStatic) return;
    bar.style.transform = `scaleY(${p})`;
    section.classList.toggle('is-moving', p > 0.01);
    if (engine) engine.p = p;
    const b = BLOCKS.find((x) => p >= x.from && p < x.to);
    show(b ? b.id : '');
    const id = b?.id ?? BLOCKS.slice().reverse().find((x) => p >= x.from)?.id ?? 'intro';
    hud.querySelector('.j-name')!.textContent = `${String(BLOCKS.findIndex((x) => x.id === id) + 1).padStart(2, '0')} / ${BLOCKS.length} · ${tr(NAMES[id])}`;
  };
  onLang(() => {
    render();
    if (!isStatic) update(last);
  });

  let last = 0;
  trigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (st) => {
      last = st.progress;
      update(st.progress);
    },
    onToggle: (st) => {
      if (st.isActive) engine?.start();
      else engine?.stop();
      nav.classList.toggle('in-journey', st.isActive);
    },
  });
  ScrollTrigger.create({
    trigger: section,
    start: 'bottom 80px',
    onEnter: () => nav.classList.add('solid'),
    onLeaveBack: () => nav.classList.remove('solid'),
  });
  update(0);

  // El motor 3D (Three.js) se descarga aparte.
  (async () => {
    try {
      const { Journey } = await import('../journey/journey');
      const j = new Journey(sticky, reduced);
      if (j.isSoftware() && !location.search.includes('gl=force')) {
        j.renderer.dispose();
        j.renderer.domElement.remove();
        staticMode('no-gpu');
        return;
      }
      await j.init(setPre);
      setPre(1);
      j.onMix = (m) => sound.set(m);
      j.onHud = (h) => {
        hud.querySelector('.j-coord')!.textContent = `${fmt(h.lat, 'N', 'S')} · ${fmt(h.lon, 'E', 'W')}`;
        hud.querySelector('.j-alt')!.textContent = `ALT ${Math.round(h.alt).toLocaleString('es-ES')} m`;
      };
      engine = j;
      j.p = last;
      sticky.classList.add('is-ready');
      // Salida de la precarga: el contador sube y la cortina se abre.
      gsap.timeline({ delay: 0.5 })
        .to(pre.querySelectorAll('p, .j-pre-bar'), { yPercent: -60, opacity: 0, duration: 0.6, stagger: 0.05, ease: 'power3.in' })
        .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=0.2')
        .add(() => { pre.hidden = true; active = ''; update(last); });
      const r = section.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) j.start();
      if (location.search.includes('gl=force')) (window as unknown as { __journey: Journey }).__journey = j;
    } catch (err) {
      console.warn('[viaje]', err);
      staticMode('error');
    }
  })();
}
