import { CONTACT, FAQS, HOUSES, type House } from '../content';
import { lang, onLang, t, tr } from '../i18n';
import { CONCEPT } from '../concept';

type State = { house: House['id']; start: Date | null; end: Date | null; guests: number; month: Date; hover: Date | null };

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const same = (a: Date | null, b: Date | null) => !!a && !!b && a.getTime() === b.getTime();
const nightsOf = (a: Date | null, b: Date | null) => (a && b ? Math.round((b.getTime() - a.getTime()) / 86_400_000) : 0);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const state: State = {
  house: 'maelo',
  start: null,
  end: null,
  guests: 2,
  month: new Date(today().getFullYear(), today().getMonth(), 1),
  hover: null,
};

let renderAll = () => {};

export function selectHouse(id: House['id']) {
  state.house = id;
  renderAll();
}

const gable = `<svg viewBox="0 0 40 30" aria-hidden="true"><path d="M3 28V13L20 3l17 10v15z" fill="currentColor" opacity=".18"/><path d="M3 28V13L20 3l17 10v15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 28V17h16v11" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

export function initBooking() {
  const pick = document.getElementById('house-pick')!;
  const cal = document.getElementById('cal')!;
  const out = document.getElementById('guests') as HTMLOutputElement;
  const ticket = document.getElementById('ticket')!;
  const faq = document.getElementById('faq')!;

  const fmt = (d: Date | null, long = false) =>
    d ? new Intl.DateTimeFormat(lang(), long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }).format(d) : '—';

  const renderPick = () => {
    pick.innerHTML = HOUSES.map((h) => `
      <label class="pick ${h.id === state.house ? 'is-on' : ''}">
        <input type="radio" name="house" value="${h.id}" ${h.id === state.house ? 'checked' : ''} />
        ${gable}
        <span><b>${h.name}</b><small>${h.area} m² · ${t('from')} ${h.priceFrom} €</small></span>
      </label>`).join('');
  };

  const month = (first: Date) => {
    const title = new Intl.DateTimeFormat(lang(), { month: 'long', year: 'numeric' }).format(first);
    const wd = [...Array(7)].map((_, i) => new Intl.DateTimeFormat(lang(), { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i)));
    const offset = (first.getDay() + 6) % 7; // semana empieza en lunes
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const end = state.end ?? (state.start && state.hover && state.hover > state.start ? state.hover : null);
    let cells = '';
    for (let i = 0; i < offset; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const date = new Date(first.getFullYear(), first.getMonth(), d);
      const past = date < today();
      const cls = [
        same(date, state.start) && 'is-start',
        same(date, end) && 'is-end',
        state.start && end && date > state.start && date < end && 'is-in',
        same(date, today()) && 'is-today',
      ].filter(Boolean).join(' ');
      cells += `<button type="button" class="cal-day ${cls}" data-date="${iso(date)}" ${past ? 'disabled' : ''} aria-label="${fmt(date, true)}" aria-pressed="${same(date, state.start) || same(date, state.end)}">${d}</button>`;
    }
    return `<div class="cal-month"><p class="cal-title">${title}</p><div class="cal-grid">${wd.map((w) => `<span class="wd">${w}</span>`).join('')}${cells}</div></div>`;
  };

  const renderCal = () => {
    const m2 = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
    const canPrev = state.month > new Date(today().getFullYear(), today().getMonth(), 1);
    cal.innerHTML = `
      <div class="cal-head">
        <button type="button" class="round" data-m="-1" ${canPrev ? '' : 'disabled'} aria-label="${t('prev')}">←</button>
        <p class="fine">${t('pickDates')}</p>
        <button type="button" class="round" data-m="1" aria-label="${t('next')}">→</button>
      </div>
      <div class="cal-months">${month(state.month)}${month(m2)}</div>`;
  };

  const renderTicket = () => {
    const h = HOUSES.find((x) => x.id === state.house)!;
    const n = nightsOf(state.start, state.end);
    const est = n * h.priceFrom;
    const msg = lang() === 'es'
      ? `Hola, Manuel y Valeria. Me gustaría reservar ${h.name}${n ? ` del ${fmt(state.start)} al ${fmt(state.end)} (${n} noches)` : ''} para ${state.guests} ${state.guests === 1 ? 'persona' : 'personas'}. ¿Está disponible?`
      : `Hello Manuel and Valeria. I’d like to book ${h.name}${n ? ` from ${fmt(state.start)} to ${fmt(state.end)} (${n} nights)` : ''} for ${state.guests} ${state.guests === 1 ? 'guest' : 'guests'}. Is it available?`;
    ticket.innerHTML = `
      <div class="tk-top">
        ${gable}
        <div><p class="eyebrow">${tr(h.position)}</p><p class="tk-name">${h.name}</p></div>
        <p class="price"><small>${t('from')}</small> <b>${h.priceFrom} €</b><small> / ${t('night')}</small></p>
      </div>
      <dl class="tk-rows">
        <div><dt>${t('checkin')}</dt><dd>${fmt(state.start, true)}</dd></div>
        <div><dt>${t('checkout')}</dt><dd>${fmt(state.end, true)}</dd></div>
        <div><dt>${t('nights')}</dt><dd>${n || '—'}</dd></div>
        <div><dt>${t('step3')}</dt><dd>${state.guests}</dd></div>
      </dl>
      <div class="tk-est ${n ? 'is-on' : ''}">
        <p><span>${t('estimate')}</span><b>${n ? `≈ ${est.toLocaleString(lang())} €` : '—'}</b></p>
        <p class="fine">${t('estimateNote')}</p>
      </div>
      <div class="tk-actions">
        ${CONCEPT ? `
        <button type="button" class="btn btn-sun" data-demo>${t('goEngine')}</button>
        <button type="button" class="btn btn-ghost" data-demo>${t('goWhatsapp')}</button>
        <button type="button" class="btn btn-link" data-demo>${t('goEmail')}</button>
        <p class="fine demo-note" hidden></p>` : `
        <a class="btn btn-sun" href="${CONTACT.bookingEngine}" target="_blank" rel="noopener">${t('goEngine')}</a>
        <a class="btn btn-ghost" href="https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${t('goWhatsapp')}</a>
        <a class="btn btn-link" href="mailto:${CONTACT.email}?subject=${encodeURIComponent(`${lang() === 'es' ? 'Reserva' : 'Booking'} · ${h.name}`)}&body=${encodeURIComponent(msg)}">${t('goEmail')}</a>`}
      </div>
      <ul class="tk-policies"><li>${t('discount')}</li><li>${t('policy1')}</li><li>${t('policy2')}</li><li>${t('policy3')}</li></ul>`;
  };

  const renderFaq = () => {
    faq.innerHTML = FAQS.map((f) => `<details><summary>${tr(f.q)}</summary><p>${tr(f.a)}</p></details>`).join('');
  };

  renderAll = () => {
    renderPick();
    renderCal();
    renderTicket();
    out.value = String(state.guests);
  };
  renderAll();
  renderFaq();
  onLang(() => {
    renderAll();
    renderFaq();
  });

  pick.addEventListener('change', (e) => {
    state.house = (e.target as HTMLInputElement).value as House['id'];
    renderAll();
  });

  cal.addEventListener('click', (e) => {
    const el = e.target as Element;
    const m = el.closest<HTMLButtonElement>('[data-m]');
    if (m) {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + Number(m.dataset.m), 1);
      return renderCal();
    }
    const day = el.closest<HTMLButtonElement>('button.cal-day');
    if (!day || day.disabled) return;
    const [y, mo, d] = day.dataset.date!.split('-').map(Number);
    const date = new Date(y, mo - 1, d);
    if (!state.start || state.end || date <= state.start) {
      state.start = date;
      state.end = null;
    } else {
      state.end = date;
    }
    state.hover = null;
    renderCal();
    renderTicket();
    cal.querySelector<HTMLButtonElement>(`[data-date="${iso(date)}"]`)?.focus();
  });

  // Vista previa del rango al pasar por encima.
  cal.addEventListener('pointerover', (e) => {
    if (!state.start || state.end) return;
    const day = (e.target as Element).closest<HTMLButtonElement>('button.cal-day');
    if (!day) return;
    const [y, mo, d] = day.dataset.date!.split('-').map(Number);
    state.hover = new Date(y, mo - 1, d);
    cal.querySelectorAll<HTMLButtonElement>('button.cal-day').forEach((b) => {
      const [yy, mm, dd] = b.dataset.date!.split('-').map(Number);
      const bd = new Date(yy, mm - 1, dd);
      b.classList.toggle('is-in', bd > state.start! && bd < state.hover!);
      b.classList.toggle('is-end', same(bd, state.hover) && state.hover! > state.start!);
    });
  });

  const step = (n: number) => {
    state.guests = Math.min(5, Math.max(1, state.guests + n));
    out.value = String(state.guests);
    renderTicket();
  };
  document.getElementById('g-minus')!.addEventListener('click', () => step(-1));
  document.getElementById('g-plus')!.addEventListener('click', () => step(1));

  // Por defecto, un fin de semana de dos noches a partir del próximo viernes.
  const fri = addDays(today(), ((5 - today().getDay() + 7) % 7) || 7);
  state.start = fri;
  state.end = addDays(fri, 2);
  state.month = new Date(fri.getFullYear(), fri.getMonth(), 1);
  renderAll();
}
