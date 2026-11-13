import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MOMENTS } from '../content';
import { onLang, tr } from '../i18n';
import { LivePhoto } from '../live/livephoto';
import { DAY_SCENES } from '../live/scenes';
import { fmtHour } from '../time';
import { scrollToY } from '../scroll';

const INTRO = 0.35; // tramo inicial (en «momentos») con solo el título

export function initDay() {
  const section = document.getElementById('dia')!;
  const scene = document.getElementById('day-scene')!;
  const wrap = document.getElementById('day-moments')!;
  const dots = document.getElementById('day-dots')!;
  const clockFill = document.getElementById('clock-fill')!;
  const clockTime = document.getElementById('clock-time')!;
  const scenes = DAY_SCENES();
  const n = MOMENTS.length;
  const live = new LivePhoto(scene, scenes[0], { pointer: true, label: 'Un día en el valle, del amanecer a la noche, en fotos reales' });
  live.onReady = () => scenes.forEach((s) => live.load(s));

  section.style.setProperty('--moments', String(n));

  const render = () => {
    wrap.innerHTML = MOMENTS.map((m, i) => `
      <article class="moment" data-i="${i}">
        <div class="moment-card">
          <p class="moment-time"><b>${fmtHour(m.hour)}</b> · ${tr(m.label)}</p>
          <h3 class="h3">${tr(m.title)}</h3>
          <p>${tr(m.text)}</p>
        </div>
        <figure class="polaroid moment-photo">
          <img src="/photos/${m.photo}" alt="${tr(m.alt)}" loading="lazy" decoding="async" />
          <figcaption>${tr(m.label)}</figcaption>
        </figure>
      </article>`).join('');
    dots.innerHTML = MOMENTS.map((m, i) => `
      <li><button type="button" data-i="${i}"><span class="sr">${tr(m.label)}</span><i aria-hidden="true">${fmtHour(m.hour).slice(0, 2)}h</i></button></li>`).join('');
    active = -2;
    update(last);
  };

  let active = -2;
  let last = 0;

  const update = (progress: number) => {
    last = progress;
    // f: posición en «momentos» (negativa durante la intro).
    const f = progress * (n + INTRO) - INTRO;
    const i = Math.max(0, Math.min(n - 1, Math.floor(f)));
    const local = Math.max(0, Math.min(1, f - i));
    const a = scenes[i];
    const b = scenes[Math.min(n - 1, i + 1)];
    a.dolly = 0.04 + local * 0.22;
    b.dolly = 0.04;
    live.a = a;
    live.b = b;
    live.mix = i < n - 1 ? Math.max(0, (local - 0.72) / 0.28) : 0;
    live.redraw();

    const h0 = MOMENTS[i].hour;
    const h1 = i < n - 1 ? MOMENTS[i + 1].hour : MOMENTS[i].hour + 0.8;
    const hour = f < 0 ? h0 - 0.6 : h0 + (h1 - h0) * local;
    clockFill.style.strokeDashoffset = String(1 - hour / 24);
    clockTime.textContent = fmtHour(hour);

    const idx = f < 0 ? -1 : live.mix > 0.5 ? i + 1 : i;
    if (idx === active) return;
    active = idx;
    scene.classList.toggle('has-moment', idx >= 0);
    wrap.querySelectorAll<HTMLElement>('.moment').forEach((el, k) => {
      el.classList.toggle('is-active', k === idx);
      el.classList.toggle('is-past', k < idx);
    });
    dots.querySelectorAll('button').forEach((btn, k) => btn.classList.toggle('is-active', k === idx));
  };

  render();
  onLang(render);

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (st) => update(st.progress),
    onRefresh: (st) => update(st.progress),
  });

  dots.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('button');
    if (!btn) return;
    const k = Number(btn.dataset.i);
    const span = section.offsetHeight - innerHeight;
    const top = section.getBoundingClientRect().top + scrollY;
    scrollToY(top + ((k + INTRO + 0.3) / (n + INTRO)) * span);
  });
}
