/** Normaliza cualquier hora a [0, 24). */
export const wrap = (h: number) => ((h % 24) + 24) % 24;

/** Hora actual en Vegacervera (Europa/Madrid), en horas decimales. */
export function madridHour(): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const hh = Number(parts.find((p) => p.type === 'hour')?.value ?? 12);
    const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return hh + mm / 60;
  } catch {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }
}

export const fmtHour = (hour: number) => {
  const h = wrap(hour);
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};
