export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

/** Русская форма слова для числа: plural(1,'день','дня','дней') → 'день'. */
export function plural(n: number, one: string, few: string, many: string) {
  const abs = Math.abs(Math.round(n)) % 100;
  const tail = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (tail === 1) return one;
  if (tail >= 2 && tail <= 4) return few;
  return many;
}

export const tierLabels: Record<string, string> = {
  free: 'Бесплатно',
  standard: 'Стандарт',
  pro: 'Pro',
  premium: 'Премиум',
};

export const tierColors: Record<string, string> = {
  free: 'text-muted',
  standard: 'text-muted',
  pro: 'text-primary',
  premium: 'text-premium',
};
