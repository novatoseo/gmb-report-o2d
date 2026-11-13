import { t } from './i18n';
import { onLang } from './i18n';

/** Versión de demostración: aviso visible y sin enlaces que funcionen como la web real. */
export const CONCEPT = import.meta.env.VITE_CONCEPT === '1';

export function initConcept() {
  if (!CONCEPT) return;
  document.documentElement.classList.add('is-concept');
  const bar = document.createElement('p');
  bar.className = 'concept-bar';
  bar.setAttribute('role', 'note');
  const paint = () => (bar.textContent = t('conceptBar'));
  paint();
  onLang(paint);
  document.body.prepend(bar);

  // Los botones de contacto y reserva solo explican qué harían.
  document.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-demo]');
    if (!b) return;
    e.preventDefault();
    const note = b.parentElement?.querySelector<HTMLElement>('.demo-note');
    if (note) {
      note.textContent = t('demoNote');
      note.hidden = false;
    }
  });
}
