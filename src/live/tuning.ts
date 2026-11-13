// Multiplicadores globales de los efectos de las fotos vivas.
// Panel de ajuste visible solo con ?ajustes en la URL; los valores se recuerdan en el navegador.

export const TUNE = {
  move: 1.3,   // movimiento 3D (parallax y cámara)
  night: 1,    // oscuridad de la noche
  snow: 1,     // densidad de la nieve
  fog: 1,      // niebla
  clouds: 1,   // movimiento de las nubes
  glow: 1,     // halo de las luces
};
export type TuneKey = keyof typeof TUNE;
const DEFAULTS = { ...TUNE };

const KEY = 'fdv-ajustes';
function wantsPanel() {
  return location.search.includes('ajustes') || location.hash === '#ajustes';
}
try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  if (saved && wantsPanel()) Object.assign(TUNE, saved);
} catch {
  /* sin almacenamiento */
}

const listeners = new Set<() => void>();
export const onTune = (cb: () => void) => listeners.add(cb);

const LABELS: Record<TuneKey, string> = {
  move: 'Movimiento 3D',
  night: 'Noche (oscuridad)',
  snow: 'Nieve',
  fog: 'Niebla',
  clouds: 'Nubes',
  glow: 'Halo de las luces',
};

export function initTuningPanel() {
  if (!wantsPanel()) return;
  const box = document.createElement('aside');
  box.className = 'tune';
  box.setAttribute('aria-label', 'Ajustes de intensidad');
  const render = () => {
    box.innerHTML = `
      <p class="tune-title">Ajustes de intensidad</p>
      ${(Object.keys(TUNE) as TuneKey[]).map((k) => `
        <label><span>${LABELS[k]} <b>${TUNE[k].toFixed(2)}</b></span>
          <input type="range" min="0" max="2" step="0.05" value="${TUNE[k]}" data-k="${k}" /></label>`).join('')}
      <div class="tune-row">
        <button type="button" data-act="copy">Copiar valores</button>
        <button type="button" data-act="reset">Restablecer</button>
      </div>
      <pre class="tune-out" hidden></pre>`;
  };
  render();
  box.addEventListener('input', (e) => {
    const i = e.target as HTMLInputElement;
    const k = i.dataset.k as TuneKey;
    TUNE[k] = Number(i.value);
    i.previousElementSibling!.querySelector('b')!.textContent = TUNE[k].toFixed(2);
    try { localStorage.setItem(KEY, JSON.stringify(TUNE)); } catch { /* */ }
    listeners.forEach((cb) => cb());
  });
  box.addEventListener('click', async (e) => {
    const act = (e.target as HTMLElement).dataset.act;
    if (act === 'copy') {
      const text = (Object.keys(TUNE) as TuneKey[]).map((k) => `${LABELS[k]}: ${TUNE[k].toFixed(2)}`).join('\n');
      try {
        await navigator.clipboard.writeText(text);
        (e.target as HTMLElement).textContent = '¡Copiado!';
      } catch {
        const out = box.querySelector<HTMLElement>('.tune-out')!;
        out.textContent = text;
        out.hidden = false;
        getSelection()?.selectAllChildren(out);
      }
    }
    if (act === 'reset') {
      Object.assign(TUNE, DEFAULTS);
      try { localStorage.removeItem(KEY); } catch { /* */ }
      render();
      listeners.forEach((cb) => cb());
    }
  });
  document.body.append(box);
}
