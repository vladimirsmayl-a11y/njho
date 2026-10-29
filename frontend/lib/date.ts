/** YYYY-MM-DD по локальному времени пользователя (серии считаются по его календарным дням). */
export function localISO(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return localISO(new Date(y, m - 1, d + days));
}

export function fmtDate(iso: string): string {
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function fmtWeekday(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('ru-RU', { weekday: 'short' });
}
