import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HOUSES, JOURNEY } from '../content';
import { onLang, t, tr } from '../i18n';
import { asset } from '../asset';
import type { Journey } from '../journey/journey';
import { Ambience } from '../journey/sound';
import { hasRealGPU, withTimeout } from '../gpu';

// Rangos de scroll de cada texto (deben coincidir con CHAPTERS en journey/journey.ts).
const BLOCKS: { id: string; from: number; to: number; pos: 'center' | 'left' | 'right' | 'top'; bg: string; moment: number }[] = [
  { id: 'intro', from: -1, to: 0.06, pos: 'center', bg: 'atardecer', moment: 0 },
  { id: 'descent', from: 0.1, to: 0.22, pos: 'left', bg: 'amanecer', moment: 0 },
  { id: 'house', from: 0.265, to: 0.34, pos: 'left', bg: 'otono', moment: 1 },
  // Mismos tercios que el foco de la fachada (journey.ts: de 0,38 a 0,503)
  { id: 'unit-0', from: 0.38, to: 0.421, pos: 'right', bg: 'fachada', moment: 1 },
  { id: 'unit-1', from: 0.421, to: 0.462, pos: 'right', bg: 'fachada', moment: 1 },
  { id: 'unit-2', from: 0.462, to: 0.503, pos: 'right', bg: 'fachada', moment: 1 },
  { id: 'trail', from: 0.6, to: 0.74, pos: 'left', bg: 'otono', moment: 2 },
  { id: 'night', from: 0.875, to: 0.93, pos: 'top', bg: 'atardecer', moment: 3 },
  { id: 'outro', from: 0.96, to: 2, pos: 'center', bg: 'invierno', moment: 3 },
];
const MOMENTS: { es: string; en: string }[] = [
  { es: 'El valle', en: 'The valley' },
  { es: 'Las casas', en: 'The houses' },
  { es: 'Desde la puerta', en: 'From the door' },
  { es: 'El silencio', en: 'The silence' },
];

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
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  el.innerHTML = `<span class="sr">${safe}</span>` + text.split(' ').map((w) => `<span class="jw" aria-hidden="true">${[...w].map((ch) => `<span class="jc">${ch}</span>`).join('')}</span>`).join(' ');
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
    soundBtn.querySelector('.j-sound-label')!.textContent = t('soundLabel');
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
    nav.classList.remove('in-journey');
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
    if (!section.classList.contains('has-3d-titles')) scramble(title, 0, 0.022);
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
    const moment = BLOCKS.find((x) => x.id === id)?.moment ?? 0;
    hud.querySelector('.j-name')!.textContent = `${String(moment + 1).padStart(2, '0')} / ${String(MOMENTS.length).padStart(2, '0')} · ${tr(MOMENTS[moment])}`;
  };
  let langChanged = false;
  onLang(() => {
    render();
    if (!isStatic) update(last);
    langChanged = true;
    void engine?.setLang();
  });
  // Pestaña en segundo plano: el sonido se para.
  document.addEventListener('visibilitychange', () => sound.pause(document.hidden || !trigger?.isActive));

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
      sound.pause(!st.isActive);
      if (!isStatic) nav.classList.toggle('in-journey', st.isActive);
    },
  });
  ScrollTrigger.create({
    trigger: section,
    start: 'bottom 80px',
    onEnter: () => nav.classList.add('solid'),
    onLeaveBack: () => nav.classList.remove('solid'),
  });
  update(0);

  // El motor 3D (Three.js) se descarga aparte, y solo si hay una GPU real.
  if (!hasRealGPU()) {
    staticMode('no-gpu');
    return;
  }
  (async () => {
    let j: Journey | null = null;
    try {
      const { Journey } = await withTimeout(import('../journey/journey'), 20000, 'código del viaje');
      j = new Journey(sticky, reduced);
      // Si algo no llega en 25 s (fuente, relieve, fotos), se pasa a la versión en fotos.
      await withTimeout(j.init(setPre), 25000, 'carga del viaje');
      setPre(1);
      j.onMix = (m) => sound.set(m);
      j.onHud = (h) => {
        hud.querySelector('.j-coord')!.textContent = `${fmt(h.lat, 'N', 'S')} · ${fmt(h.lon, 'E', 'W')}`;
        hud.querySelector('.j-alt')!.textContent = `ALT ${Math.round(h.alt).toLocaleString('es-ES')} m`;
      };
      j.onLost = () => {
        engine = null;
        sound.pause(true);
        staticMode('error');
      };
      engine = j;
      j.p = last;
      // Si se cambió de idioma mientras cargaba, los titulares 3D se ponen al día.
      if (langChanged) void j.setLang();
      sticky.classList.add('is-ready');
      section.classList.add('has-3d-titles');
      // Salida de la precarga: el contador sube y la cortina se abre.
      const jj = j;
      gsap.timeline({ delay: 0.5 })
        .to(pre.querySelectorAll('p, .j-pre-bar'), { yPercent: -60, opacity: 0, duration: 0.6, stagger: 0.05, ease: 'power3.in' })
        .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=0.2')
        .add(() => { pre.hidden = true; active = ''; update(last); jj.startTitles(); });
      const r = section.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) j.start();
      if (location.search.includes('gl=force')) (window as unknown as { __journey: Journey }).__journey = j;
    } catch (err) {
      console.warn('[viaje]', err);
      j?.dispose();
      engine = null;
      staticMode('error');
    }
  })();
}
