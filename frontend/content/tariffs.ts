export interface Tariff {
  id: 'standard' | 'pro' | 'premium';
  name: string;
  price: string;
  pricePeriod?: string; // например "/месяц"
  oldPrice?: string; // зачёркнутая цена для подмеси «выгодно»
  description: string;
  features: string[];
  href: string;
  featured?: boolean;
  badge?: string; // «Популярный», «Выгода 20%»
}

// Ссылки на оплату в Paywall задаются переменными окружения (см. .env.example)
export const tariffs: Tariff[] = [
  {
    id: 'standard',
    name: 'Стандарт',
    price: '499',
    pricePeriod: '₽ / месяц',
    oldPrice: '599 ₽',
    description: 'Закрытое сообщество в Telegram',
    badge: 'Старт',
    features: [
      'Закрытый Telegram-канал',
      'Общение с участниками',
      'Еженедельные разборы прогресса',
    ],
    href: process.env.NEXT_PUBLIC_PAYWALL_STANDARD || '#',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '990',
    pricePeriod: '₽ / месяц',
    oldPrice: '1 290 ₽',
    description: 'Сообщество и личный кабинет',
    badge: 'Популярный',
    featured: true,
    features: [
      'Всё из тарифа «Стандарт»',
      'Личный кабинет на сайте',
      'Трекер привычек и планер',
      'Дневник и марафоны',
      'Еженедельный отчёт от куратора',
    ],
    href: process.env.NEXT_PUBLIC_PAYWALL_PRO || '#',
  },
  {
    id: 'premium',
    name: 'Премиум',
    price: '1 500',
    pricePeriod: '₽ / месяц',
    oldPrice: '2 100 ₽',
    description: 'Полный доступ к экосистеме',
    badge: 'Максимум',
    features: [
      'Всё из тарифа Pro',
      'Расширенные марафоны с куратором',
      'Индивидуальный план развития',
      'Приоритетная поддержка',
      'Весь функционал платформы',
    ],
    href: process.env.NEXT_PUBLIC_PAYWALL_PREMIUM || '#',
  },
];
