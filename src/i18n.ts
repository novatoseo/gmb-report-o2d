import { UI, type L, type Lang } from './content';

const KEY = 'fdv-lang';
const listeners = new Set<(lang: Lang) => void>();

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    /* almacenamiento no disponible */
  }
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

let current: Lang = initialLang();

export const lang = () => current;

/** Texto localizado de un objeto {es, en}. */
export const tr = (l: L) => l[current];

/** Texto de la interfaz por clave (admite claves anidadas como "phase.dusk"). */
export function t(key: string): string {
  const node = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], UI);
  return node && typeof node === 'object' && 'es' in (node as object) ? (node as L)[current] : key;
}

export function onLang(cb: (lang: Lang) => void) {
  listeners.add(cb);
}

/** Sustituye todos los [data-i18n] y [data-i18n-attr="atributo:clave"] del documento. */
export function applyStatic(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n!);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr!.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr.trim(), t(key.trim()));
    });
  });
  document.documentElement.lang = current;
}

export function setLang(next: Lang) {
  if (next === current) return;
  current = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* sin persistencia */
  }
  applyStatic();
  listeners.forEach((cb) => cb(next));
}
