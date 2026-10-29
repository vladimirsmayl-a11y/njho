/* Демо-данные: используются, если API недоступен.
   Позволяют оценить интерфейс без поднятого бэкенда. */

export const demoUser = {
  id: 'u-1',
  username: 'alexey',
  email: 'alexey@lvs.app',
  avatar_url: null,
  tier: 'premium' as const,
  streak: 34,
  completed_today: 5,
  total_tasks: 428,
  freeze_count: 2,
  day_progress: 71,
};

/** История привычек за 28 дней в виде ISO-дат (для демо-режима). */
function demoHistory(skip: (i: number) => boolean): string[] {
  const out: string[] = [];
  for (let i = 27; i >= 0; i -= 1) {
    if (skip(i)) continue;
    const date = new Date();
    date.setDate(date.getDate() - i);
    out.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
  }
  return out;
}

export const demoHabits = [
  {
    id: 'h-1',
    title: 'Подъём в 6:00',
    icon: '🌅',
    done: true,
    streak: 12,
    history: demoHistory((i) => i % 7 === 3),
  },
  {
    id: 'h-2',
    title: 'Тренировка 45 минут',
    icon: '🏋️',
    done: true,
    streak: 8,
    history: demoHistory((i) => i % 5 === 1),
  },
  {
    id: 'h-3',
    title: 'Чтение 20 страниц',
    icon: '📖',
    done: false,
    streak: 21,
    history: demoHistory((i) => i % 6 === 4),
  },
  {
    id: 'h-4',
    title: 'Дневник вечером',
    icon: '✍️',
    done: false,
    streak: 4,
    history: demoHistory((i) => i % 4 === 2),
  },
  {
    id: 'h-5',
    title: 'Без сахара',
    icon: '🍃',
    done: true,
    streak: 6,
    history: demoHistory((i) => i % 3 === 0),
  },
];

export const demoDashboard = {
  streak: 34,
  completed_today: 5,
  total_tasks: 428,
  weekly_progress: 78,
  day_progress: 71,
  freeze_count: 2,
  best_streak: 61,
};

export const demoTasks = [
  { id: 't-1', title: 'Подъём в 6:00', description: 'Без телефона первые 30 минут', due_time: '06:00', is_done: true, tag: 'Дисциплина' },
  { id: 't-2', title: 'Тренировка 45 минут', description: 'Силовая: спина и плечи', due_time: '07:30', is_done: true, tag: 'Спорт' },
  { id: 't-3', title: 'Чтение 20 страниц', description: '«Атомные привычки», глава 7', due_time: '09:00', is_done: true, tag: 'Обучение' },
  { id: 't-4', title: 'Глубокая работа 90 минут', description: 'Без уведомлений, один проект', due_time: '10:00', is_done: true, tag: 'Фокус' },
  { id: 't-5', title: 'Прогулка 8 000 шагов', description: 'Свежий воздух и подкаст', due_time: '18:00', is_done: true, tag: 'Здоровье' },
  { id: 't-6', title: 'Дневник вечером', description: 'Три победы дня и один урок', due_time: '21:30', is_done: false, tag: 'Рефлексия' },
  { id: 't-7', title: 'Отбой до 23:00', description: 'Экран в сторону, комната проветрена', due_time: '22:30', is_done: false, tag: 'Сон' },
];

export const demoWeekDays = [
  { day: 'Пн', score: 100 },
  { day: 'Вт', score: 86 },
  { day: 'Ср', score: 71 },
  { day: 'Чт', score: 100 },
  { day: 'Пт', score: 57 },
  { day: 'Сб', score: 86 },
  { day: 'Вс', score: 43 },
];

export const demoTactics = [
  { id: 'tac-1', title: 'Подъём в 6:00', icon: 'sunrise' },
  { id: 'tac-2', title: 'Тренировка 45 мин', icon: 'flame' },
  { id: 'tac-3', title: 'Чтение 20 страниц', icon: 'book' },
  { id: 'tac-4', title: 'Дневник вечером', icon: 'pen' },
  { id: 'tac-5', title: 'Без сахара', icon: 'leaf' },
];

export const demoMarathons = [
  {
    id: 'm-1',
    title: 'Утренний подъём',
    description: '21 день ранних подъёмов, зарядки и тишины до первого уведомления.',
    start_date: '12 окт',
    tier: 'premium',
    participants_count: 1284,
    tasks_count: 12,
    cover: 'from-[#1b2a12] via-[#0f1a0a] to-[#0a0a0a]',
    accent: 'text-primary',
    icon: 'sunrise',
    curator: 'Куратор: Марина К.',
    duration: '21 день',
  },
  {
    id: 'm-2',
    title: 'Глубокая работа',
    description: '30 дней фокус-сессий по 90 минут. Меньше шума — больше сделанного.',
    start_date: '3 ноя',
    tier: 'pro',
    participants_count: 642,
    tasks_count: 18,
    cover: 'from-[#1a1a22] via-[#111116] to-[#0a0a0a]',
    accent: 'text-white',
    icon: 'brain',
    curator: 'Куратор: Илья Р.',
    duration: '30 дней',
  },
  {
    id: 'm-3',
    title: 'Сильное тело',
    description: '8 недель тренировок и питания. Программа для занятых людей.',
    start_date: '1 дек',
    tier: 'premium',
    participants_count: 2107,
    tasks_count: 24,
    cover: 'from-[#2a1612] via-[#1a0f0c] to-[#0a0a0a]',
    accent: 'text-[#FF8A65]',
    icon: 'dumbbell',
    curator: 'Куратор: Дмитрий С.',
    duration: '8 недель',
  },
  {
    id: 'm-4',
    title: 'Читатель года',
    description: '12 книг за 12 недель. Короткие конспекты и обсуждения в чате.',
    start_date: '15 дек',
    tier: 'pro',
    participants_count: 389,
    tasks_count: 12,
    cover: 'from-[#241d0e] via-[#171208] to-[#0a0a0a]',
    accent: 'text-premium',
    icon: 'book',
    curator: 'Куратор: Анна В.',
    duration: '12 недель',
  },
  {
    id: 'm-5',
    title: 'Цифровой детокс',
    description: '14 дней осознанного использования телефона и соцсетей.',
    start_date: '20 дек',
    tier: 'premium',
    participants_count: 956,
    tasks_count: 14,
    cover: 'from-[#101d24] via-[#0b1418] to-[#0a0a0a]',
    accent: 'text-[#4FC3F7]',
    icon: 'phone',
    curator: 'Куратор: Марина К.',
    duration: '14 дней',
  },
  {
    id: 'm-6',
    title: 'Финансовый порядок',
    description: 'Учёт, подушка и первые инвестиции. Без сложных терминов.',
    start_date: '10 янв',
    tier: 'pro',
    participants_count: 731,
    tasks_count: 16,
    cover: 'from-[#16241a] via-[#0d1710] to-[#0a0a0a]',
    accent: 'text-primary',
    icon: 'wallet',
    curator: 'Куратор: Сергей Л.',
    duration: '6 недель',
  },
];

export const demoMarathonTasks = [
  { id: 'mt-1', title: 'Подъём в 6:00', description: 'Фото будильника или вид из окна.', status: 'done' },
  { id: 'mt-2', title: 'Зарядка 15 минут', description: 'Любой комплекс на выбор.', status: 'done' },
  { id: 'mt-3', title: 'Стакан воды до кофе', description: 'Отметьте в трекере.', status: 'review' },
  { id: 'mt-4', title: '10 страниц книги', description: 'Конспект в двух предложениях.', status: 'open' },
  { id: 'mt-5', title: 'Дневник вечером', description: 'Три победы и один урок дня.', status: 'open' },
];

export const demoMessages = [
  { id: 'msg-1', sender_name: 'Марина К.', text: 'Доброе утро, команда! День 7 — экватор. Кто уже заметил, что просыпаться стало легче?', created_at: '07:02', is_me: false, avatar_url: null },
  { id: 'msg-2', sender_name: 'Илья Р.', text: 'Да, впервые за долгое время встал без третьего будильника.', created_at: '07:14', is_me: false, avatar_url: null },
  { id: 'msg-3', sender_name: 'Вы', text: 'У меня пока качели, но зарядка уже вошла в привычку. Держимся!', created_at: '07:21', is_me: true, avatar_url: null },
  { id: 'msg-4', sender_name: 'Анна В.', text: 'Вот мой вид из окна сегодня. Мороз, но красиво.', created_at: '07:33', is_me: false, avatar_url: null, image_url: 'gradient' },
  { id: 'msg-5', sender_name: 'Марина К.', text: 'Сегодня до 22:00 сдаём фото зарядки. Не забывайте про воду.', created_at: '08:05', is_me: false, avatar_url: null },
];

export const demoFriends = [
  { id: 'f-1', username: 'Марина К.', tier: 'premium', streak: 112, completed_tasks: 1640, rank: 'Легенда', online: true, tagline: 'Куратор марафонов' },
  { id: 'f-2', username: 'Илья Р.', tier: 'pro', streak: 47, completed_tasks: 812, rank: 'Мастер', online: true, tagline: 'Глубокая работа' },
  { id: 'f-3', username: 'Анна В.', tier: 'premium', streak: 38, completed_tasks: 703, rank: 'Мастер', online: false, tagline: 'Читатель года' },
  { id: 'f-4', username: 'Дмитрий С.', tier: 'pro', streak: 21, completed_tasks: 445, rank: 'Атлет', online: false, tagline: 'Сильное тело' },
  { id: 'f-5', username: 'Сергей Л.', tier: 'free', streak: 9, completed_tasks: 168, rank: 'Новичок', online: true, tagline: 'Финансовый порядок' },
  { id: 'f-6', username: 'Ольга М.', tier: 'pro', streak: 64, completed_tasks: 921, rank: 'Мастер', online: false, tagline: 'Утренний подъём' },
];

export const demoArticles = [
  {
    id: 'a-1',
    title: 'Как высыпаться за 7 часов',
    excerpt: 'Не количество сна, а его качество определяет утро. Пять привычек, которые работают уже через неделю.',
    category_id: 'sleep',
    category_title: 'Сон',
    read_time: '7 мин',
    author: 'Марина К.',
    accent: 'from-[#1c2430] to-[#0a0a0a]',
  },
  {
    id: 'a-2',
    title: 'Утренний свет вместо кофе',
    excerpt: 'Почему 10 минут у окна бодрят лучше эспрессо и как настроить циркадные ритмы без усилий.',
    category_id: 'sleep',
    category_title: 'Сон',
    read_time: '5 мин',
    author: 'Илья Р.',
    accent: 'from-[#242012] to-[#0a0a0a]',
  },
  {
    id: 'a-3',
    title: 'Тренировка, которую не бросишь',
    excerpt: 'Минимальная эффективная доза движения: 3 подхода по 12 минут в неделю. С чего начать без спортзала.',
    category_id: 'sport',
    category_title: 'Спорт',
    read_time: '8 мин',
    author: 'Дмитрий С.',
    accent: 'from-[#2a1612] to-[#0a0a0a]',
  },
  {
    id: 'a-4',
    title: 'Белок, клетчатка и вода',
    excerpt: 'Простая тарелка, которая держит сытость 4 часа. Без подсчёта каждой калории.',
    category_id: 'food',
    category_title: 'Питание',
    read_time: '6 мин',
    author: 'Анна В.',
    accent: 'from-[#16241a] to-[#0a0a0a]',
  },
  {
    id: 'a-5',
    title: 'Метод 12 недель: почему год — плохая единица',
    excerpt: 'Короткие горизонты дают плотность прогресса. Как разбить большую цель на 12 недель.',
    category_id: 'learn',
    category_title: 'Обучение',
    read_time: '9 мин',
    author: 'Сергей Л.',
    accent: 'from-[#1a1a22] to-[#0a0a0a]',
  },
  {
    id: 'a-6',
    title: 'Дисциплина как система, а не сила воли',
    excerpt: 'Среда решает больше, чем характер. Три настройки, которые убирают необходимость заставлять себя.',
    category_id: 'discipline',
    category_title: 'Дисциплина',
    read_time: '7 мин',
    author: 'Марина К.',
    accent: 'from-[#1b2a12] to-[#0a0a0a]',
  },
];

export const demoArticleContent: Record<string, string> = {
  'a-1': `Сон — это не пауза между делами, а активная фаза восстановления. За семь часов мозг успевает пройти четыре-пять циклов, если не мешать ему. Проблема большинства — не длительность, а то, что мы ложимся в разное время и просыпаемся от уведомлений.

Начните с фиксированного времени подъёма. Даже в выходные. Первые три дня будет тяжело, но организму нужен якорь, вокруг которого выстроится ритм. Второй шаг — свет. Утром откройте шторы и выйдите на улицу хотя бы на десять минут: яркий свет останавливает выработку мелатонина и запускает кортизоловый пик.

Третий шаг — температура. Прохладная спальня (18–20 °C) ускоряет засыпание. Четвёртый — экран. Не обязательно откладывать телефон за два часа, достаточно убрать его из кровати и включить тёплый фильтр за час до сна.

Пятый шаг — короткая запись. Три строки о том, что сделано, и одна — о том, что беспокоит. Это снимает фоновую тревогу, с которой люди чаще всего и борются, ворочаясь в постели. Через неделю вы заметите, что засыпаете быстрее, а утренняя ясность держится до обеда.`,
};

export const demoAdminUsers = [
  { id: 'u-1', username: 'alexey', tier: 'premium', last_seen: 'сегодня, 09:41', is_blocked: false, streak: 34, tasks: 428, joined: '12 мар 2025' },
  { id: 'u-2', username: 'marina.k', tier: 'premium', last_seen: 'сегодня, 08:12', is_blocked: false, streak: 112, tasks: 1640, joined: '2 фев 2025' },
  { id: 'u-3', username: 'ilya.r', tier: 'pro', last_seen: 'вчера, 22:08', is_blocked: false, streak: 47, tasks: 812, joined: '18 апр 2025' },
  { id: 'u-4', username: 'anna.v', tier: 'premium', last_seen: 'вчера, 19:34', is_blocked: false, streak: 38, tasks: 703, joined: '7 мая 2025' },
  { id: 'u-5', username: 'dmitry.s', tier: 'pro', last_seen: '2 дня назад', is_blocked: false, streak: 21, tasks: 445, joined: '21 июн 2025' },
  { id: 'u-6', username: 'sergey.l', tier: 'free', last_seen: '3 дня назад', is_blocked: false, streak: 9, tasks: 168, joined: '1 сен 2025' },
  { id: 'u-7', username: 'olga.m', tier: 'pro', last_seen: '4 дня назад', is_blocked: true, streak: 64, tasks: 921, joined: '14 июл 2025' },
  { id: 'u-8', username: 'nikita.p', tier: 'free', last_seen: 'неделю назад', is_blocked: false, streak: 3, tasks: 42, joined: '2 окт 2025' },
];

export const demoActivity = [
  { day: 'Пн', dau: 312, wau: 890 },
  { day: 'Вт', dau: 348, wau: 902 },
  { day: 'Ср', dau: 331, wau: 915 },
  { day: 'Чт', dau: 389, wau: 931 },
  { day: 'Пт', dau: 402, wau: 948 },
  { day: 'Сб', dau: 356, wau: 940 },
  { day: 'Вс', dau: 421, wau: 968 },
];

export const demoLogs = [
  { id: 'l-1', time: '09:41', level: 'info', actor: 'admin', message: 'Выдан Premium пользователю alexey' },
  { id: 'l-2', time: '09:12', level: 'info', actor: 'system', message: 'Создан марафон «Цифровой детокс»' },
  { id: 'l-3', time: '08:55', level: 'warn', actor: 'system', message: 'Просрочена оплата: sergey.l' },
  { id: 'l-4', time: '08:20', level: 'error', actor: 'system', message: 'Ошибка доставки уведомления: 3 получателя' },
  { id: 'l-5', time: 'вчера', level: 'info', actor: 'admin', message: 'Заблокирован пользователь olga.m' },
  { id: 'l-6', time: 'вчера', level: 'info', actor: 'system', message: 'Экспорт базы знаний: 42 статьи' },
];
