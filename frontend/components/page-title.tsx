'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const DEFAULT_TITLE = 'ЛВС — Лучшая Версия Себя';

/** Заголовок вкладки для каждого раздела. Сортируется по длине при поиске. */
const TITLES: Record<string, string> = {
  '/dashboard': 'Кабинет — ЛВС',
  '/tracker/12-weeks': 'Квартал — ЛВС',
  '/tracker/tempo': 'Темп дня — ЛВС',
  '/tracker': 'Трекеры — ЛВС',
  '/journal': 'Дневник — ЛВС',
  '/marathons/create': 'Новый марафон — ЛВС',
  '/marathons': 'Марафоны — ЛВС',
  '/knowledge': 'База знаний — ЛВС',
  '/friends/invite': 'Пригласить друга — ЛВС',
  '/friends': 'Друзья — ЛВС',
  '/profile': 'Профиль — ЛВС',
  '/settings': 'Настройки — ЛВС',
  '/admin': 'Админка — ЛВС',
  '/pricing': 'Тарифы — ЛВС',
  '/paywall': 'Доступ ограничен — ЛВС',
  '/login': 'Вход — ЛВС',
  '/contacts': 'Контакты — ЛВС',
  '/terms': 'Пользовательское соглашение — ЛВС',
  '/privacy': 'Политика конфиденциальности — ЛВС',
};

const PREFIXES = Object.keys(TITLES).sort((a, b) => b.length - a.length);

/** Держит document.title в соответствии с текущим маршрутом. */
export function PageTitle() {
  const pathname = usePathname();

  useEffect(() => {
    const route = PREFIXES.find((p) => pathname === p || pathname.startsWith(`${p}/`));
    document.title = route ? TITLES[route] : DEFAULT_TITLE;
  }, [pathname]);

  return null;
}
