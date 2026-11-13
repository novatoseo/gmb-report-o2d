import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MOMENTS } from '../content';
import { onLang, tr } from '../i18n';
import { fmtHour } from '../scene/palette';
import { Valley } from '../scene/valley';
import { scrollToY } from '../scroll';

const START = 5.4;
const END = 23.6;

export function initDay() {
  const section = document.getElementById('dia')!;
  const scene = document.getElementById('day-scene')!;
  const wrap = document.getElementById('day-moments')!;
  const dots = document.getElementById('day-dots')!;
  const clockFill = document.getElementById('clock-fill')!;
  const clockTime = document.getElementById('clock-time')!;
  const valley = new Valley(scene, { id: 'dv', label: 'El valle a lo largo de un día', parallax: true, lazy: true });

  section.style.setProperty('--moments', String(MOMENTS.length));

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
    update(lastHour);
  };

  let active = -2;
  let lastHour = START;
  const items = () => wrap.querySelectorAll<HTMLElement>('.moment');

  const update = (hour: number) => {
    lastHour = hour;
    valley.setHour(hour);
    clockFill.style.strokeDashoffset = String(1 - hour / 24);
    clockTime.textContent = fmtHour(hour);
    let idx = -1;
    MOMENTS.forEach((m, i) => {
      if (hour >= m.hour - 1) idx = i;
    });
    if (idx === active) return;
    active = idx;
    scene.classList.toggle('has-moment', idx >= 0);
    items().forEach((el, i) => {
      el.classList.toggle('is-active', i === idx);
      el.classList.toggle('is-past', i < idx);
    });
    dots.querySelectorAll('button').forEach((b, i) => b.classList.toggle('is-active', i === idx));
  };

  render();
  onLang(render);

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (st) => update(START + st.progress * (END - START)),
    onRefresh: (st) => update(START + st.progress * (END - START)),
  });

  dots.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button');
    if (!b) return;
    const m = MOMENTS[Number(b.dataset.i)];
    const span = section.offsetHeight - innerHeight;
    const top = section.getBoundingClientRect().top + scrollY;
    scrollToY(top + ((m.hour - START + 0.4) / (END - START)) * span);
  });
}
