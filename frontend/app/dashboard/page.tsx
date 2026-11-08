'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  Flame,
  Plus,
  Snowflake,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AppShell,
  Button,
  Card,
  Confetti,
  Input,
  Modal,
  PageHeader,
  Progress,
  TaskCheckbox,
  TierBadge,
  playSound,
  toast,
} from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { api, body } from '@/lib/api';
import { demoDashboard, demoHabits, demoTasks, demoUser } from '@/lib/demo';
import { todayISO } from '@/lib/tempo';
import { useI18n } from '@/lib/i18n';
import { cn, plural } from '@/lib/utils';

type Task = {
  id: string;
  title: string;
  description?: string;
  due_time?: string;
  tag?: string;
  is_done: boolean;
};

type Habit = {
  id: string;
  title: string;
  icon: string;
  done: boolean;
  streak: number;
  history: string[];
};

type RemoteTask = { id: number; title: string; done: boolean; tag?: string | null; due_time?: string | null };
type RemoteHabit = { id: number; title: string; icon?: string; done: boolean; streak: number; history?: string[] };

type Stats = {
  streak: number;
  best_streak: number;
  freeze_count: number;
  percent: number;
  tasks_done: number;
  tasks_total: number;
  day_closed: boolean;
  frozen_yesterday: boolean;
};

const HABIT_EMOJI = ['🌅', '🏋️', '📖', '✍️', '🍃', '💧', '🧘', '🚶'];

const fade = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function greetingKey() {
  const hour = new Date().getHours();
  if (hour < 5) return 'dash.greetingNight' as const;
  if (hour < 12) return 'dash.greetingMorning' as const;
  if (hour < 18) return 'dash.greetingDay' as const;
  return 'dash.greetingEvening' as const;
}

function todayLabel() {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

function Ring({ value }: { value: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  return (
    <div className="relative h-[70px] w-[70px] shrink-0">
      <svg viewBox="0 0 70 70" className="h-full w-full -rotate-90">
        <circle cx="35" cy="35" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle
          cx="35"
          cy="35"
          r={radius}
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="numeric font-display text-[15px] font-extrabold leading-none text-white">{value}%</span>
        <span className="mt-0.5 text-[7px] uppercase tracking-[0.14em] text-muted">дня</span>
      </div>
    </div>
  );
}

type SeriesState = 'idle' | 'closed' | 'frozen';

function SeriesOrb({ state, burst }: { state: SeriesState; burst: number }) {
  const isClosed = state === 'closed';
  const isFrozen = state === 'frozen';

  return (
    <div className="widget-3d relative h-[74px] w-[74px] shrink-0">
      <div
        className="absolute inset-0 rounded-full blur-xl"
        style={{
          background: isClosed
            ? 'rgba(255,90,54,0.35)'
            : isFrozen
              ? 'rgba(127,200,255,0.35)'
              : 'rgba(255,255,255,0.06)',
        }}
      />
      <motion.div
        key={`${state}-${burst}`}
        animate={
          burst
            ? { scale: [0.9, 1.18, 1], rotate: [0, -8, 0] }
            : isClosed
              ? { scale: [1, 1.05, 1] }
              : { y: [0, -3, 0] }
        }
        transition={{ duration: burst ? 0.8 : 3.4, repeat: burst ? 0 : Infinity, ease: 'easeInOut' }}
        className={cn(
          'absolute inset-1 rounded-full border',
          isClosed
            ? 'border-[#FF5A36]/60 bg-[radial-gradient(circle_at_32%_26%,#ffffff,#ffb199_40%,#FF5A36_72%,#b32d14)] text-danger'
            : isFrozen
              ? 'border-[#7FC8FF]/60 bg-[radial-gradient(circle_at_32%_26%,#ffffff,#b3e8ff_40%,#7FC8FF_72%,#1d5a8a)] text-primary'
              : 'border-white/[0.12] bg-[radial-gradient(circle_at_32%_26%,#ffffff,#f5f5f5_40%,#d4d4d4_72%,#666666)] text-white/50',
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {isClosed ? (
            <Flame className="h-8 w-8 animate-fire text-[#FF5A36]" fill="currentColor" strokeWidth={1.4} />
          ) : isFrozen ? (
            <Snowflake className="h-7 w-7 text-[#7FC8FF]" strokeWidth={1.4} />
          ) : (
            <Flame className="h-7 w-7 text-white/40" fill="currentColor" strokeWidth={1.2} />
          )}
        </div>
      </motion.div>
      <div className="widget-orbit absolute -inset-1 rounded-full border" style={{ transform: 'rotateX(66deg)' }} />
      <div className="widget-orbit-slow absolute -inset-2.5 rounded-full border" style={{ transform: 'rotateY(60deg)' }} />
    </div>
  );
}

export default function DashboardPage() {
  const { user, demo, loading } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats>({
    streak: demoDashboard.streak,
    best_streak: demoDashboard.best_streak,
    freeze_count: demoDashboard.freeze_count,
    percent: 0,
    tasks_done: 0,
    tasks_total: 0,
    day_closed: false,
    frozen_yesterday: false,
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [celebrate, setCelebrate] = useState(false);
  const [fireBurst, setFireBurst] = useState(0);
  const [justClosed, setJustClosed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [habitTitle, setHabitTitle] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [tag, setTag] = useState('');
  const [freezeBusy, setFreezeBusy] = useState(false);
  const closedRef = useRef(false);

  const today = todayISO();

  useEffect(() => {
    if (loading) return;
    let alive = true;

    if (demo) {
      let storedTasks: Task[] | null = null;
      let storedHabits: Habit[] | null = null;
      try {
        const raw = window.localStorage.getItem('lvs:tasks');
        storedTasks = raw ? (JSON.parse(raw) as Task[]) : null;
        const rawHabits = window.localStorage.getItem('lvs:habits');
        storedHabits = rawHabits ? (JSON.parse(rawHabits) as Habit[]) : null;
      } catch {
        storedTasks = null;
      }
      const nextTasks = storedTasks ?? (demoTasks as Task[]);
      setTasks(nextTasks);
      setHabits(storedHabits ?? (demoHabits as Habit[]));
      const done = nextTasks.filter((task) => task.is_done).length;
      const closed = nextTasks.length > 0 && done === nextTasks.length;
      setStats({
        streak: demoDashboard.streak + (closed ? 1 : 0),
        best_streak: Math.max(demoDashboard.best_streak, demoDashboard.streak + (closed ? 1 : 0)),
        freeze_count: demoDashboard.freeze_count,
        percent: nextTasks.length ? Math.round((done / nextTasks.length) * 100) : 0,
        tasks_done: done,
        tasks_total: nextTasks.length,
        day_closed: closed,
        frozen_yesterday: false,
      });
      setTasksLoading(false);
      return () => {
        alive = false;
      };
    }

    setTasksLoading(true);
    (async () => {
      try {
        const [rows, remote, habitRows] = await Promise.all([
          api<RemoteTask[]>(`/tasks?date=${today}`),
          api<{
            streak: number;
            best_streak: number;
            freeze_count?: number;
            percent: number;
            tasks_done: number;
            tasks_total: number;
            day_closed?: boolean;
            frozen_yesterday?: boolean;
          }>(`/dashboard?today=${today}`),
          api<RemoteHabit[]>(`/habits?date=${today}&days=28`),
        ]);
        if (!alive) return;
        const mapped = rows.map((row) => ({
          id: String(row.id),
          title: row.title,
          is_done: row.done,
          tag: row.tag || undefined,
          due_time: row.due_time || undefined,
        }));
        setTasks(mapped);
        setHabits(
          habitRows.map((row, index) => ({
            id: String(row.id),
            title: row.title,
            icon: row.icon && row.icon !== 'spark' ? row.icon : HABIT_EMOJI[index % HABIT_EMOJI.length],
            done: row.done,
            streak: row.streak,
            history: row.history ?? [],
          })),
        );
        setStats({
          streak: remote.streak,
          best_streak: remote.best_streak,
          freeze_count: remote.freeze_count ?? user?.freeze_count ?? 0,
          percent: remote.percent,
          tasks_done: remote.tasks_done,
          tasks_total: remote.tasks_total,
          day_closed: remote.day_closed ?? (remote.tasks_total > 0 && remote.tasks_done === remote.tasks_total),
          frozen_yesterday: remote.frozen_yesterday ?? false,
        });
      } catch {
        if (alive) {
          setTasks([]);
          setHabits([]);
        }
      } finally {
        if (alive) setTasksLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [loading, demo, today, user?.id]);

  useEffect(() => {
    if (!demo || loading || tasksLoading) return;
    try {
      window.localStorage.setItem('lvs:tasks', JSON.stringify(tasks));
    } catch {
      /* переполнение хранилища */
    }
  }, [tasks, demo, loading, tasksLoading]);

  useEffect(() => {
    if (!demo || loading) return;
    try {
      window.localStorage.setItem('lvs:habits', JSON.stringify(habits));
    } catch {
      /* переполнение хранилища */
    }
  }, [habits, demo, loading]);

  const done = tasks.filter((task) => task.is_done).length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const name = user?.username || demoUser.username;
  const streak = stats.streak;
  const best = stats.best_streak;
  const dayClosed = stats.day_closed;
  const frozen = stats.frozen_yesterday;
  const freeze = stats.freeze_count;

  const celebrateDay = () => {
    setCelebrate(true);
    setJustClosed(true);
    setFireBurst((value) => value + 1);
    playSound('levelup');
    toast('День закрыт', {
      description: 'Огонёк загорелся — серия продлена.',
      tone: 'success',
    });
    window.setTimeout(() => setCelebrate(false), 3200);
    window.setTimeout(() => setJustClosed(false), 1400);
  };

  const toggleTask = async (id: string) => {
    const current = tasks.find((task) => task.id === id);
    if (!current) return;
    const nextDone = !current.is_done;
    const updated = tasks.map((task) => (task.id === id ? { ...task, is_done: nextDone } : task));
    setTasks(updated);
    const nextDoneCount = updated.filter((task) => task.is_done).length;
    const nextClosed = updated.length > 0 && nextDoneCount === updated.length;

    if (!demo) {
      try {
        const res = await api<{
          day_closed: boolean;
          streak: number;
          best_streak: number;
          tasks_done: number;
          tasks_total: number;
          percent: number;
        }>(`/tasks/${id}`, { method: 'PATCH', body: body({ done: nextDone }) });
        setStats({
          streak: res.streak,
          best_streak: res.best_streak,
          freeze_count: freeze,
          percent: res.percent,
          tasks_done: res.tasks_done,
          tasks_total: res.tasks_total,
          day_closed: res.day_closed,
          frozen_yesterday: frozen,
        });
        if (res.day_closed && !closedRef.current) {
          closedRef.current = true;
          celebrateDay();
        } else if (!res.day_closed) {
          closedRef.current = false;
        }
      } catch {
        setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, is_done: !nextDone } : task)));
        toast('Не удалось сохранить отметку', {
          description: 'Проверьте соединение и попробуйте ещё раз',
          tone: 'danger',
        });
        return;
      }
      if (!nextDone) playSound('click');
      return;
    }

    setStats((prev) => ({
      ...prev,
      percent: updated.length ? Math.round((nextDoneCount / updated.length) * 100) : 0,
      tasks_done: nextDoneCount,
      tasks_total: updated.length,
      day_closed: nextClosed,
      streak: nextClosed ? Math.max(prev.streak, demoDashboard.streak + 1) : prev.streak,
    }));
    if (nextClosed && !closedRef.current) {
      closedRef.current = true;
      celebrateDay();
    } else if (!nextClosed) {
      closedRef.current = false;
      if (nextDone) playSound('spark');
      else playSound('click');
    }
  };

  const toggleHabit = async (id: string) => {
    const current = habits.find((habit) => habit.id === id);
    if (!current) return;
    const nextDone = !current.done;
    setHabits((prev) =>
      prev.map((habit) =>
        habit.id === id
          ? {
              ...habit,
              done: nextDone,
              streak: nextDone ? habit.streak + 1 : Math.max(0, habit.streak - 1),
              history: nextDone
                ? Array.from(new Set([...habit.history, today]))
                : habit.history.filter((day) => day !== today),
            }
          : habit,
      ),
    );
    if (!demo) {
      try {
        await api(`/habits/${id}/log`, { method: 'PUT', body: body({ date: today, done: nextDone }) });
      } catch {
        setHabits((prev) => prev.map((habit) => (habit.id === id ? { ...habit, done: current.done } : habit)));
        toast('Не удалось сохранить привычку', { tone: 'danger' });
      }
    }
  };

  const addTask = async () => {
    const clean = title.trim();
    if (!clean) return;

    if (!demo) {
      try {
        const created = await api<RemoteTask>('/tasks', {
          method: 'POST',
          body: body({ title: clean, date: today, tag: tag.trim() || null, due_time: dueTime || null }),
        });
        setTasks((prev) => [
          ...prev,
          { id: String(created.id), title: created.title, is_done: created.done, tag: created.tag || undefined, due_time: created.due_time || undefined },
        ]);
        setStats((prev) => ({ ...prev, tasks_total: prev.tasks_total + 1, day_closed: false, percent: Math.round((prev.tasks_done / (prev.tasks_total + 1)) * 100) }));
      } catch {
        toast('Не удалось добавить задачу', {
          description: 'Проверьте соединение и попробуйте ещё раз',
          tone: 'danger',
        });
        return;
      }
    } else {
      const task: Task = {
        id: `local-${Date.now()}`,
        title: clean,
        due_time: dueTime || undefined,
        tag: tag.trim() || undefined,
        is_done: false,
      };
      setTasks((prev) => [...prev, task]);
      setStats((prev) => ({
        ...prev,
        tasks_total: prev.tasks_total + 1,
        day_closed: false,
        percent: Math.round((prev.tasks_done / (prev.tasks_total + 1)) * 100),
      }));
    }

    setTitle('');
    setDueTime('');
    setTag('');
    setAddOpen(false);
    playSound('spark');
    toast('Задача добавлена', { description: clean, tone: 'success' });
  };

  const addHabit = async () => {
    const clean = habitTitle.trim();
    if (!clean) return;
    const emoji = HABIT_EMOJI[habits.length % HABIT_EMOJI.length];
    if (!demo) {
      try {
        const created = await api<{ id: number; title: string; icon?: string }>('/habits', {
          method: 'POST',
          body: body({ title: clean, date: today, icon: emoji }),
        });
        setHabits((prev) => [
          ...prev,
          { id: String(created.id), title: created.title, icon: emoji, done: false, streak: 0, history: [] },
        ]);
      } catch {
        toast('Не удалось добавить привычку', { tone: 'danger' });
        return;
      }
    } else {
      setHabits((prev) => [
        ...prev,
        { id: `h-${Date.now()}`, title: clean, icon: emoji, done: false, streak: 0, history: [] },
      ]);
    }
    setHabitTitle('');
    setHabitOpen(false);
    playSound('spark');
    toast('Привычка добавлена', { description: clean, tone: 'success' });
  };

  const applyFreeze = async () => {
    if (freeze <= 0 || dayClosed || frozen) return;
    setFreezeBusy(true);
    if (!demo) {
      try {
        const res = await api<{ freeze_count: number }>('/streak/freeze', { method: 'POST' });
        setStats((prev) => ({
          ...prev,
          freeze_count: res.freeze_count,
          streak: prev.streak + 1,
          frozen_yesterday: true,
        }));
        toast('Заморозка применена', { description: 'Серия сохранена за вчерашний день.', tone: 'success' });
      } catch {
        toast('Не удалось применить заморозку', { tone: 'danger' });
      }
    } else {
      setStats((prev) => ({
        ...prev,
        freeze_count: Math.max(0, prev.freeze_count - 1),
        streak: prev.streak + 1,
        frozen_yesterday: true,
      }));
      toast('Заморозка применена', { description: 'Серия сохранена.', tone: 'success' });
    }
    setFreezeBusy(false);
  };

  return (
    <AppShell>
      <Confetti show={celebrate} />
      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-8">
        <PageHeader
          eyebrow={
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[10.5px] tracking-wide text-muted first-letter:uppercase">
                <CalendarDays className="h-3 w-3" /> {todayLabel()}
              </span>
              <TierBadge tier={user?.tier || demoUser.tier} />
            </div>
          }
          title={
            <>
              {t(greetingKey())}, {name}
            </>
          }
          subtitle={t('dash.subtitle')}
          actions={
            <>
              <Button variant="ghost" href="/tracker/stats">
                <BarChart3 className="h-4 w-4" /> {t('nav.stats')}
              </Button>
              <Button variant="ghost" href="/tracker/12-weeks">
                <CalendarDays className="h-4 w-4" /> {t('dash.quarter')}
              </Button>
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> {t('dash.addTask')}
              </Button>
            </>
          }
        />

        {/* Три карточки статистики: огонёк (3D), выполнение дня, заморозки */}
        <div className="grid gap-4 sm:grid-cols-3">
          <motion.div variants={fade} initial="hidden" animate="show" custom={0} className="h-full">
            <Card
              className={cn(
                'relative flex h-full min-h-[164px] flex-col justify-between overflow-hidden p-5',
                dayClosed
                  ? 'border-[#FF5A36]/40 bg-[#1a0a08]'
                  : frozen
                    ? 'border-[#7FC8FF]/40 bg-[#0a141a]'
                    : 'border-white/[0.12] bg-[#0f0f10]',
              )}
            >
              <div
                className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full blur-3xl"
                style={{
                  background: dayClosed
                    ? 'rgba(255,90,54,0.2)'
                    : frozen
                      ? 'rgba(127,200,255,0.2)'
                      : 'rgba(255,255,255,0.03)',
                }}
              />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className={cn('label', dayClosed ? 'text-[#FF5A36]/60' : frozen ? 'text-[#7FC8FF]/60' : 'text-white/50')}>
                    {t('dash.streak')}
                  </p>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    {dayClosed ? (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="numeric font-display text-[30px] font-extrabold leading-none tracking-[-0.03em] text-[#FF5A36]"
                      >
                        День {streak}
                      </motion.span>
                    ) : (
                      <>
                        <span className="numeric font-display text-[32px] font-extrabold leading-none text-white">{streak}</span>
                        <span className="text-[12px] text-white/45">
                          {plural(streak, 'день', 'дня', 'дней')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <SeriesOrb state={dayClosed ? 'closed' : frozen ? 'frozen' : 'idle'} burst={fireBurst} />
              </div>
              <div className="relative mt-3">
                <p className="text-[11px] text-white/50">
                  {dayClosed
                    ? 'Серия сохранена — огонёк горит'
                    : frozen
                      ? 'Вчерашний день заморожен — серия сохранена'
                      : tasks.length === 0
                        ? 'Добавьте задачи, чтобы зажечь огонёк'
                        : 'Продлите огонёк — закройте день'}
                </p>
                <div className="mt-2.5 flex items-center gap-2 border-t pt-2.5 border-white/[0.06]">
                  <ArrowUpRight className="h-3 w-3 text-white/30" />
                  <p className="text-[10px] text-white/35">
                    {t('dash.record')} — {best} {plural(best, 'день', 'дня', 'дней')}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={fade} initial="hidden" animate="show" custom={1} className="h-full">
            <Card className="flex h-full min-h-[164px] flex-col justify-between p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="label">{t('dash.dayDone')}</p>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="numeric font-display text-[32px] font-extrabold leading-none text-white">{progress}%</span>
                    <span className="text-[12px] text-muted">
                      {done}/{tasks.length}
                    </span>
                  </div>
                </div>
                <Ring value={progress} />
              </div>
              <p className="mt-3 text-[11px] text-muted">
                {tasks.length === 0
                  ? t('dash.noTasksShort')
                  : done === tasks.length
                    ? t('dash.dayClosed')
                    : `${tasks.length - done} ${plural(tasks.length - done, 'задача', 'задачи', 'задач')} ${t('dash.left')}`}
              </p>
            </Card>
          </motion.div>

          <motion.div variants={fade} initial="hidden" animate="show" custom={2} className="h-full">
            <Card className="relative flex h-full min-h-[164px] flex-col justify-between overflow-hidden border-[#7FC8FF]/20 bg-[#0b141b] p-5">
              <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-[#7FC8FF]/[0.14] blur-3xl" />
              <div className="frost-shimmer pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#7FC8FF]/10 to-transparent" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="label text-[#9fd8ff]/60">{t('dash.freezes')}</p>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="numeric font-display text-[32px] font-extrabold leading-none text-white">{freeze}</span>
                    <span className="text-[12px] text-[#9fd8ff]/50">{t('dash.inReserve')}</span>
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#7FC8FF]/25 bg-[#7FC8FF]/[0.08] text-[#9fd8ff]">
                  <Snowflake className="h-5 w-5 frost-shimmer" strokeWidth={1.6} />
                </div>
              </div>
              <button
                type="button"
                onClick={applyFreeze}
                disabled={freeze <= 0 || dayClosed || frozen || freezeBusy}
                className="relative mt-3 flex items-center gap-1.5 text-left text-[11px] text-[#9fd8ff]/70 transition-colors hover:text-[#9fd8ff] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Snowflake className="h-3 w-3" />
                {dayClosed
                  ? 'Сегодня серия уже сохранена'
                  : frozen
                    ? 'Вчерашний день уже заморожен'
                    : freeze > 0
                      ? 'Применить к вчерашнему дню'
                      : 'Появятся после недели серии'}
              </button>
            </Card>
          </motion.div>
        </div>

        {/* Фокус на сегодня */}
        <motion.div
          id="tasks"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.45 }}
          className="mt-5"
        >
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="label">{t('dash.focus')}</p>
                <h2 className="mt-1.5 font-display text-xl font-bold tracking-[-0.02em] text-white">{t('dash.tasksDay')}</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="numeric text-[11px] text-muted">{progress}%</span>
                <Progress value={progress} className="w-20" barClassName="bg-white" glow={false} />
              </div>
            </div>

            <div className="space-y-2">
              {tasksLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-[52px] animate-pulse rounded-2xl border border-white/[0.05] bg-white/[0.02]" />
                  ))
                : null}
              {!tasksLoading && tasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.12] px-4 py-8 text-center">
                  <p className="text-[13px] text-white/70">{t('dash.noTasks')}</p>
                  <p className="mt-1 text-[11.5px] text-muted">{t('dash.noTasksHint')}</p>
                </div>
              ) : null}
              {!tasksLoading &&
                tasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.16 + index * 0.03, duration: 0.3 }}
                    className={cn(
                      'group flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-all duration-300',
                      task.is_done
                        ? 'border-white/[0.06] bg-white/[0.015]'
                        : 'border-white/[0.12] bg-white/[0.025] hover:border-white/[0.24] hover:bg-white/[0.045]',
                    )}
                  >
                    <TaskCheckbox checked={task.is_done} onToggle={() => toggleTask(task.id)} label={task.title} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p
                          className={cn(
                            'text-[13.5px] font-medium transition-all duration-300',
                            task.is_done ? 'text-white/35 line-through' : 'text-white',
                          )}
                        >
                          {task.title}
                        </p>
                        {task.tag ? (
                          <span className="rounded-full border border-white/[0.1] px-2 py-0.5 text-[9.5px] uppercase tracking-[0.12em] text-white/40">
                            {task.tag}
                          </span>
                        ) : null}
                      </div>
                      {task.description ? <p className="mt-0.5 truncate text-[11.5px] text-muted">{task.description}</p> : null}
                    </div>
                    <span className="numeric hidden shrink-0 text-[11px] text-muted sm:block">{task.due_time}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-transparent transition-all group-hover:translate-x-0.5 group-hover:text-white/30" />
                  </motion.div>
                ))}
            </div>

            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.14] py-2.5 text-[12px] text-muted transition-colors hover:border-white/[0.28] hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" /> {t('dash.addTask')}
            </button>

            <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
              <p className="text-[11.5px] text-muted">
                {tasks.length === 0
                  ? t('dash.noTasksHint')
                  : done === tasks.length
                    ? t('dash.dayClosedNote')
                    : `Осталось ${tasks.length - done} ${plural(tasks.length - done, 'задача', 'задачи', 'задач')} ${t('dash.remainingNote')}`}
              </p>
              <Button variant="ghost" size="sm" href="/tracker">
                {t('dash.allTrackers')} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Привычки */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.45 }}
          className="mt-5"
        >
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="label">{t('dash.habits')}</p>
                <h2 className="mt-1.5 font-display text-xl font-bold tracking-[-0.02em] text-white">
                  {habits.filter((habit) => habit.done).length}/{habits.length} сегодня
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setHabitOpen(true)}
                className="flex items-center gap-1.5 rounded-full border border-white/[0.12] px-3 py-1.5 text-[11px] text-white/60 transition-colors hover:border-white/30 hover:text-white"
              >
                <Plus className="h-3 w-3" /> Добавить
              </button>
            </div>

            <div className="space-y-2">
              {habits.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.12] px-4 py-7 text-center">
                  <p className="text-[13px] text-white/70">Привычек пока нет</p>
                  <p className="mt-1 text-[11.5px] text-muted">{t('dash.habitsHint')}</p>
                </div>
              ) : null}
              {habits.map((habit, index) => {
                const history = new Set(habit.history);
                return (
                  <div
                    key={habit.id}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-colors',
                      habit.done ? 'border-white/[0.07] bg-white/[0.02]' : 'border-white/[0.11] hover:border-white/[0.2]',
                    )}
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-[16px]">
                      {habit.icon && !/^[a-z-]+$/i.test(habit.icon) ? habit.icon : HABIT_EMOJI[index % HABIT_EMOJI.length]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-[13px] font-medium', habit.done ? 'text-white/60' : 'text-white')}>
                        {habit.title}
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-muted">
                        {habit.done ? `${t('dash.today')} · ${t('dash.done')}` : `${t('dash.today')} · ${t('dash.markAction')}`}
                        {habit.streak > 0 ? ` · ${habit.streak} ${plural(habit.streak, 'день', 'дня', 'дней')}` : ''}
                      </p>
                    </div>
                    <div className="hidden shrink-0 items-end gap-[3px] sm:flex" aria-hidden>
                      {Array.from({ length: 28 }).map((_, dayIndex) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (27 - dayIndex));
                        const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        const filled = history.has(iso);
                        return (
                          <span
                            key={iso}
                            className={cn(
                              'h-3.5 w-[5px] rounded-[2px] transition-colors',
                              filled ? 'bg-white/70' : 'bg-white/[0.08]',
                              iso === today && !filled && 'ring-1 ring-white/30',
                            )}
                          />
                        );
                      })}
                    </div>
                    <div className="flex shrink-0 items-end gap-[3px] sm:hidden" aria-hidden>
                      {Array.from({ length: 7 }).map((_, dayIndex) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (6 - dayIndex));
                        const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        return (
                          <span
                            key={iso}
                            className={cn('h-3.5 w-1 rounded-[2px]', history.has(iso) ? 'bg-white/70' : 'bg-white/[0.08]')}
                          />
                        );
                      })}
                    </div>
                    <TaskCheckbox checked={habit.done} onToggle={() => toggleHabit(habit.id)} label={habit.title} />
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Новая задача"
        subtitle="Запишите дело на сегодня — оно сразу появится в списке."
        width="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={addTask} disabled={!title.trim()}>
              <Plus className="h-4 w-4" /> {t('common.add')}
            </Button>
          </div>
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            addTask();
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="task-title" className="mb-2 block text-[11.5px] text-white/60">
              Что нужно сделать
            </label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: тренировка 45 минут"
              autoFocus
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="task-time" className="mb-2 block text-[11.5px] text-white/60">
                Время
              </label>
              <Input
                id="task-time"
                type="time"
                value={dueTime}
                onChange={(event) => setDueTime(event.target.value)}
                className="[color-scheme:dark]"
              />
            </div>
            <div>
              <label htmlFor="task-tag" className="mb-2 block text-[11.5px] text-white/60">
                Категория
              </label>
              <Input
                id="task-tag"
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                placeholder="Спорт, фокус…"
              />
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={habitOpen}
        onClose={() => setHabitOpen(false)}
        title="Новая привычка"
        subtitle="Маленькое действие, которое легко повторить."
        width="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setHabitOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={addHabit} disabled={!habitTitle.trim()}>
              <Check className="h-4 w-4" /> {t('common.add')}
            </Button>
          </div>
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            addHabit();
          }}
        >
          <label htmlFor="habit-title" className="mb-2 block text-[11.5px] text-white/60">
            Название привычки
          </label>
          <Input
            id="habit-title"
            value={habitTitle}
            onChange={(event) => setHabitTitle(event.target.value)}
            placeholder="Например: 20 страниц книги"
            autoFocus
          />
        </form>
      </Modal>
    </AppShell>
  );
}
