/* «Темп дня» — оценка 1–12.
   1–4  — продуктивный день
   5–8  — ровный день
   9–12 — ленивый день
   Хранится локально: { '2026-10-27': 3 } */

export const TEMPO_KEY = 'lvs:tempo';

export type TempoMap = Record<string, number>;

export type TempoZone = 'productive' | 'even' | 'lazy';

export function tempoZone(score: number): TempoZone {
  if (score <= 4) return 'productive';
  if (score <= 8) return 'even';
  return 'lazy';
}

export const tempoMeta: Record<
  TempoZone,
  { label: string; hint: string; text: string; bg: string; border: string; bar: string }
> = {
  productive: {
    label: 'Продуктивно',
    hint: 'День, который двигает вперёд',
    text: 'text-primary',
    bg: 'bg-primary/[0.08]',
    border: 'border-primary/30',
    bar: 'bg-primary',
  },
  even: {
    label: 'Ровно',
    hint: 'Без рывков, но и без провала',
    text: 'text-white/80',
    bg: 'bg-white/[0.06]',
    border: 'border-white/[0.16]',
    bar: 'bg-white/45',
  },
  lazy: {
    label: 'Лень',
    hint: 'День восстановления — тоже часть пути',
    text: 'text-[#FF6B4A]',
    bg: 'bg-[#FF6B4A]/[0.08]',
    border: 'border-[#FF6B4A]/30',
    bar: 'bg-[#FF6B4A]',
  },
};

export function isoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO() {
  return isoDate(new Date());
}

export function shiftISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

/** Последние n дат по возрастанию (старые → новые). */
export function lastDays(n: number) {
  return Array.from({ length: n }, (_, index) => shiftISO(index - (n - 1)));
}

export function shortDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(
    new Date(year, month - 1, day),
  );
}

export function longDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' }).format(
    new Date(year, month - 1, day),
  );
}

/* Демо-ритм: используется, пока пользователь не поставил ни одной оценки. */
const DEMO_SCORES = [
  4, 3, 6, 2, 8, 5, 4, 3, 7, 9, 6, 4, 2, 3, 5, 7, 10, 8, 6, 4, 3, 2, 5, 6, 4, 3, 7, 5, 4, 3,
];

export function demoMap(): TempoMap {
  const days = lastDays(DEMO_SCORES.length);
  return days.reduce<TempoMap>((acc, day, index) => {
    acc[day] = DEMO_SCORES[index];
    return acc;
  }, {});
}

export function loadTempo(): TempoMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(TEMPO_KEY);
    if (!raw) return demoMap();
    const parsed = JSON.parse(raw) as TempoMap;
    if (!parsed || typeof parsed !== 'object') return demoMap();
    return parsed;
  } catch {
    return demoMap();
  }
}

export function saveTempoScore(day: string, score: number) {
  if (typeof window === 'undefined') return;
  const map = loadTempo();
  map[day] = score;
  try {
    window.localStorage.setItem(TEMPO_KEY, JSON.stringify(map));
  } catch {
    /* приватный режим */
  }
}

/** Средняя оценка за период (1 — максимум продуктивности). */
export function averageScore(map: TempoMap, days = 30) {
  const values = lastDays(days)
    .map((day) => map[day])
    .filter((value): value is number => typeof value === 'number');
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
