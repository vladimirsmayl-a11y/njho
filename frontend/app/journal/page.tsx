'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Flame,
  PenLine,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AppShell,
  Badge,
  Button,
  Card,
  Modal,
  PageHeader,
  Textarea,
  playSound,
  toast,
} from '@/components/ui';
import { api } from '@/lib/api';
import { usePersistentState } from '@/lib/use-persistent-state';
import { cn } from '@/lib/utils';

type Entry = {
  id: string;
  content: string;
  date: string;
  created_at: string;
  mood?: string;
};

const MOODS = [
  { id: 'great', label: 'Отлично', icon: '🔥' },
  { id: 'good', label: 'Хорошо', icon: '🙂' },
  { id: 'ok', label: 'Нормально', icon: '😐' },
  { id: 'tired', label: 'Устал', icon: '😮‍💨' },
  { id: 'hard', label: 'Тяжело', icon: '🌧' },
];

const PROMPTS = [
  'Три победы сегодня',
  'Что забрало больше всего энергии?',
  'За что я себе благодарен?',
  'Один урок дня',
  'Что сделаю иначе завтра?',
];

function isoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

function longDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date(year, month - 1, day));
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  const name = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(new Date(year, month - 1, 1));
  return `${name} ${year}`;
}

function todayLabel() {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date());
}

const DEMO_ENTRIES: Entry[] = [
  {
    id: 'e-1',
    date: shiftDate(0),
    created_at: '21:42',
    mood: 'good',
    content:
      'Встал в 6:05 — почти по плану. Тренировка прошла тяжелее обычного, но сделал. На работе закрыл большую задачу, которую откладывал неделю. Вечером не открыл соцсети до 21:00. Урок: если начать день с движения, к обеду остаётся больше ясности.',
  },
  {
    id: 'e-2',
    date: shiftDate(-1),
    created_at: '22:10',
    mood: 'ok',
    content:
      'День сбился: созвон за созвоном. Но отметил воду и прогулку. Не идеально — и это нормально. Завтра защищу первый час утра под тренировку.',
  },
  {
    id: 'e-3',
    date: shiftDate(-3),
    created_at: '20:55',
    mood: 'great',
    content:
      'Лучший день недели. 90 минут глубокой работы без телефона. Понял, что мне мешает не отсутствие времени, а привычка проверять уведомления между задачами. Отключаю на завтра всё, кроме звонков.',
  },
  {
    id: 'e-4',
    date: shiftDate(-9),
    created_at: '21:18',
    mood: 'tired',
    content:
      'Много дороги и мало движения. Успел только самое важное. Вечером не стал себя добивать — лёг раньше и без экрана. Иногда восстановление и есть главная задача дня.',
  },
  {
    id: 'e-5',
    date: shiftDate(-38),
    created_at: '22:02',
    mood: 'good',
    content:
      'Закрыл первый месяц без пропусков в тренировках. Тело привыкло, просыпаться стало проще. Главное открытие: мне не нужна мотивация, нужен понятный первый шаг утром.',
  },
  {
    id: 'e-6',
    date: shiftDate(-96),
    created_at: '20:30',
    mood: 'great',
    content:
      'Перечитал записи за весну. Видно, как тревога постепенно уступала место системе. Тогда казалось, что ничего не меняется — сейчас видно, что менялось каждый день.',
  },
  {
    id: 'e-7',
    date: shiftDate(-187),
    created_at: '21:47',
    mood: 'hard',
    content:
      'Тяжёлый период. Работа забирала всё, спорт почти исчез. Важно, что я всё равно вернулся к записям. Дневник — это не отчёт перед собой, а точка возвращения.',
  },
  {
    id: 'e-8',
    date: shiftDate(-324),
    created_at: '19:12',
    mood: 'ok',
    content:
      'Начал вести дневник. Пока не понимаю, зачем, но обещал себе месяц. Пишу коротко: что было, что почувствовал, что забираю с собой в завтра.',
  },
];

const PERIODS = [
  { id: '30', label: '30 дней', days: 30 },
  { id: '90', label: '3 месяца', days: 90 },
  { id: '180', label: '6 месяцев', days: 180 },
  { id: '365', label: 'Год', days: 365 },
  { id: 'all', label: 'Всё время', days: 36500 },
] as const;

type PeriodID = (typeof PERIODS)[number]['id'];

function normalizeEntry(entry: Partial<Entry>, index: number): Entry {
  return {
    id: entry.id || `entry-${index}`,
    content: entry.content || '',
    date: entry.date || isoDate(),
    created_at: entry.created_at || '12:00',
    mood: entry.mood,
  };
}

export default function JournalPage() {
  const [draft, setDraft] = useState('');
  const [mood, setMood] = useState('good');
  const [entries, setEntries] = usePersistentState<Entry[]>('lvs:journal:v2', DEMO_ENTRIES);
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [period, setPeriod] = useState<PeriodID>('365');
  const [active, setActive] = useState<Entry | null>(null);

  useEffect(() => {
    setHydrated(true);
    let alive = true;
    (async () => {
      try {
        const remote = await api<Entry[]>('/journal/entries');
        if (alive && Array.isArray(remote) && remote.length) {
          setEntries(remote.map((entry, index) => normalizeEntry(entry, index)));
        }
      } catch {
        /* демо-режим */
      }
    })();
    return () => {
      alive = false;
    };
  }, [setEntries]);

  const words = useMemo(() => draft.trim().split(/\s+/).filter(Boolean).length, [draft]);

  const save = async () => {
    if (!draft.trim()) return;
    const entry: Entry = {
      id: `local-${Date.now()}`,
      content: draft.trim(),
      date: isoDate(),
      created_at: new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
      mood,
    };
    setEntries((prev) => [entry, ...prev]);
    setDraft('');
    setSaved(true);
    playSound('spark');
    toast('Запись сохранена', {
      description: `${longDate(entry.date)} · ${MOODS.find((item) => item.id === mood)?.label || ''}`,
      tone: 'success',
    });
    window.setTimeout(() => setSaved(false), 2400);
    try {
      await api('/journal/entries', {
        method: 'POST',
        body: JSON.stringify({ content: entry.content, mood }),
      });
    } catch {
      /* запись остаётся локально */
    }
  };

  const remove = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    setActive(null);
    playSound('error');
    toast('Запись удалена', { tone: 'danger' });
  };

  const currentPeriod = PERIODS.find((item) => item.id === period) || PERIODS[3];
  const cutoff = shiftDate(-currentPeriod.days);

  const filtered = useMemo(
    () =>
      entries
        .filter((entry) => entry.date >= cutoff)
        .slice()
        .sort((a, b) => (a.date === b.date ? b.created_at.localeCompare(a.created_at) : b.date.localeCompare(a.date))),
    [entries, cutoff],
  );

  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    filtered.forEach((entry) => {
      const key = entry.date.slice(0, 7);
      const list = map.get(key) || [];
      list.push(entry);
      map.set(key, list);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const periodCount = (days: number) => {
    const border = shiftDate(-days);
    return entries.filter((entry) => entry.date >= border).length;
  };

  return (
    <AppShell>
      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-9">
        <PageHeader
          eyebrow={
            <div className="flex items-center gap-2">
              <Badge variant="pro">Личный дневник</Badge>
              <span className="text-[10.5px] text-muted first-letter:uppercase">{todayLabel()}</span>
            </div>
          }
          title="Дневник"
          subtitle="Пять минут честной рефлексии вечером. Не отчёт, а разговор с собой."
          actions={
            <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-[11.5px] text-muted">
              <Flame className="h-3.5 w-3.5 text-[#FF5A36]" fill="currentColor" strokeWidth={1.4} />
              <span className="numeric font-semibold text-white">{entries.length}</span> записей
            </div>
          }
        />

        <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          {/* Редактор */}
          <Card className="relative overflow-hidden p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-white/[0.03] blur-3xl" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label">Новая запись</p>
                <h2 className="mt-1.5 font-display text-xl font-bold tracking-[-0.02em] text-white">
                  Как прошёл день?
                </h2>
              </div>
              <PenLine className="h-5 w-5 text-white/20" strokeWidth={1.6} />
            </div>

            <div className="mt-5">
              <p className="label mb-2.5">Состояние</p>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setMood(item.id);
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11.5px] transition-all',
                      mood === item.id
                        ? 'border-primary/40 bg-primary/[0.1] text-primary'
                        : 'border-white/[0.08] text-muted hover:border-white/[0.18] hover:text-white',
                    )}
                  >
                    <span aria-hidden>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="label">Запись</p>
                <span className="numeric text-[10.5px] text-muted">{words} слов</span>
              </div>
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Что получилось? Что забрало силы? За что вы себе благодарны сегодня?"
                className="h-48 leading-relaxed"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setDraft((prev) => (prev ? `${prev}\n\n${prompt}: ` : `${prompt}: `));
                    playSound('click');
                  }}
                  className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[10.5px] text-muted transition-colors hover:border-white/[0.16] hover:text-white"
                >
                  + {prompt}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
              <p className="text-[10.5px] text-muted">
                {saved ? 'Сохранено — до вечера можно дописать.' : 'Черновик хранится только у вас'}
              </p>
              <Button onClick={save} disabled={!draft.trim()}>
                <Save className="h-4 w-4" /> Сохранить
              </Button>
            </div>
          </Card>

          {/* Память */}
          <Card className="flex flex-col p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label">Память</p>
                <h2 className="mt-1.5 font-display text-lg font-bold tracking-[-0.02em] text-white">
                  Период архива
                </h2>
              </div>
              <BookOpen className="h-5 w-5 text-white/20" strokeWidth={1.6} />
            </div>

            <div className="mt-4 space-y-1.5">
              {PERIODS.map((item) => {
                const activePeriod = item.id === period;
                const count = periodCount(item.days);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPeriod(item.id);
                      playSound('click');
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-[12px] transition-all',
                      activePeriod
                        ? 'border-white/[0.18] bg-white/[0.06] text-white'
                        : 'border-transparent text-muted hover:bg-white/[0.03] hover:text-white',
                    )}
                  >
                    <span>{item.label}</span>
                    <span className="flex items-center gap-2">
                      <span className="numeric text-[10.5px] text-white/40">{count}</span>
                      <ChevronRight
                        className={cn(
                          'h-3.5 w-3.5 transition-transform',
                          activePeriod ? 'text-white/60' : 'text-white/15',
                        )}
                      />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto border-t border-white/[0.06] pt-4">
              <div className="flex items-center gap-2 text-[11px] text-white/60">
                <Sparkles className="h-3.5 w-3.5 text-premium/80" />
                <span className="font-semibold">Архив не исчезает</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                Записи хранятся на этом устройстве. Откройте любую — и вернитесь в тот день целиком.
              </p>
            </div>
          </Card>
        </div>

        {/* Архив */}
        <div className="mt-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="label">Архив</p>
              <h2 className="mt-1 font-display text-xl font-bold tracking-[-0.02em] text-white">
                Ваши записи
              </h2>
            </div>
            <span className="text-[11px] text-muted">
              {filtered.length} записей · {currentPeriod.label.toLowerCase()}
            </span>
          </div>

          {groups.length ? (
            <div className="space-y-7">
              {groups.map(([key, list]) => (
                <section key={key}>
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="font-display text-[13px] font-semibold uppercase tracking-[0.14em] text-white/70 first-letter:uppercase">
                      {monthLabel(key)}
                    </h3>
                    <span className="h-px flex-1 bg-white/[0.06]" />
                    <span className="numeric text-[10px] text-white/25">{list.length}</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {list.map((entry, index) => {
                      const entryMood = MOODS.find((item) => item.id === entry.mood);
                      return (
                        <motion.button
                          key={entry.id}
                          type="button"
                          onClick={() => setActive(entry)}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.35 }}
                          className="group text-left"
                        >
                          <Card hover className="flex h-full flex-col p-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-[10.5px] text-muted">
                                <CalendarDays className="h-3 w-3" />
                                <span className="first-letter:uppercase">
                                  {longDate(entry.date)}
                                </span>
                              </div>
                              {entryMood ? (
                                <span aria-hidden className="text-[13px]">
                                  {entryMood.icon}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2.5 flex-1 whitespace-pre-line text-[12.5px] leading-relaxed text-white/75 line-clamp-5">
                              {entry.content}
                            </p>
                            <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5 text-[10px] text-white/30">
                              <span className="flex items-center gap-1.5">
                                <BookOpen className="h-3 w-3" /> {entry.created_at}
                              </span>
                              <span className="flex items-center gap-1 text-primary/0 transition-colors group-hover:text-primary">
                                Читать <ChevronRight className="h-3 w-3" />
                              </span>
                            </div>
                          </Card>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-muted" strokeWidth={1.4} />
              <p className="mt-3 font-display text-base font-bold text-white">За этот период пусто</p>
              <p className="mt-1 text-[12px] text-muted">
                Выберите период пошире или напишите первую запись — она появится здесь.
              </p>
            </Card>
          )}
        </div>

        {!hydrated ? <span className="sr-only">Загрузка дневника</span> : null}
      </div>

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active ? longDate(active.date) : ''}
        subtitle={
          active
            ? `${active.created_at} · ${MOODS.find((item) => item.id === active.mood)?.label || 'Без оценки'}`
            : undefined
        }
        width="max-w-lg"
        footer={
          <div className="flex items-center justify-between gap-2">
            <Button variant="danger" size="sm" onClick={() => active && remove(active.id)}>
              <Trash2 className="h-3.5 w-3.5" /> Удалить
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setActive(null)}>
              Закрыть
            </Button>
          </div>
        }
      >
        <p className="whitespace-pre-line text-[13px] leading-relaxed text-white/80">
          {active?.content}
        </p>
      </Modal>
    </AppShell>
  );
}
