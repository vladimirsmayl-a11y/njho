'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Leaf,
  PenLine,
  Plus,
  Sparkles,
  Sunrise,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AppShell,
  Badge,
  Button,
  Card,
  Confetti,
  Input,
  Modal,
  PageHeader,
  Progress,
  Textarea,
  playSound,
} from '@/components/ui';
import { usePersistentState } from '@/lib/use-persistent-state';
import { cn, plural } from '@/lib/utils';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const ICONS: Record<string, React.ElementType> = {
  sunrise: Sunrise,
  flame: Flame,
  book: BookOpen,
  pen: PenLine,
  leaf: Leaf,
  target: Target,
};

type Tactic = { id: string; title: string; icon: string };

const DEFAULT_TACTICS: Tactic[] = [
  { id: 't1', title: 'Подъём в 6:00', icon: 'sunrise' },
  { id: 't2', title: 'Тренировка 45 минут', icon: 'flame' },
  { id: 't3', title: 'Чтение 20 страниц', icon: 'book' },
  { id: 't4', title: 'Дневник вечером', icon: 'pen' },
  { id: 't5', title: 'Без сахара', icon: 'leaf' },
];

function initialProgress() {
  const map: Record<string, boolean> = {};
  /* демо-заполнение недели 1: 30 из 35 = 86% */
  const done = new Set([
    'w1-t1-d0', 'w1-t1-d1', 'w1-t1-d2', 'w1-t1-d3', 'w1-t1-d4', 'w1-t1-d5',
    'w1-t2-d0', 'w1-t2-d1', 'w1-t2-d2', 'w1-t2-d4', 'w1-t2-d5',
    'w1-t3-d0', 'w1-t3-d1', 'w1-t3-d2', 'w1-t3-d3', 'w1-t3-d4', 'w1-t3-d5', 'w1-t3-d6',
    'w1-t4-d0', 'w1-t4-d1', 'w1-t4-d2', 'w1-t4-d3', 'w1-t4-d4',
    'w1-t5-d0', 'w1-t5-d1', 'w1-t5-d2', 'w1-t5-d3', 'w1-t5-d4', 'w1-t5-d5',
  ]);
  done.forEach((key) => {
    map[key] = true;
  });
  return map;
}

/* ============================================================
   Онбординг — 4 шага
   ============================================================ */

function Onboarding({
  open,
  onClose,
  onFinish,
}: {
  open: boolean;
  onClose: () => void;
  onFinish: (payload: { goal: string; why: string; tactics: string[] }) => void;
}) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [why, setWhy] = useState('');
  const [picked, setPicked] = useState<string[]>(['Подъём в 6:00', 'Тренировка 45 минут', 'Чтение 20 страниц']);
  const [custom, setCustom] = useState('');
  const [commit, setCommit] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setGoal('');
      setWhy('');
      setCommit(false);
    }
  }, [open]);

  const canNext =
    step === 0 ? goal.trim().length > 2 : step === 1 ? why.trim().length > 5 : step === 2 ? picked.length > 0 : commit;

  const steps = [
    {
      title: 'Каким вы будете через квартал?',
      hint: 'Опишите результат так, будто он уже случился. Конкретно и в настоящем времени.',
      icon: Target,
    },
    {
      title: 'Почему это важно именно вам?',
      hint: 'В трудный день именно эта причина вернёт вас в строй.',
      icon: Sparkles,
    },
    {
      title: 'Выберите тактики на неделю',
      hint: '3–5 привычек. Не берите всё сразу — система важнее героизма.',
      icon: Check,
    },
    {
      title: 'Готовы начать?',
      hint: 'Квартал — это 12 недель и 84 дня. Один день за раз.',
      icon: Trophy,
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#070708]/95 p-4 backdrop-blur-xl"
        >
          <div className="pointer-events-none fixed inset-0 grid-lines opacity-60" aria-hidden />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="relative my-auto w-full max-w-xl overflow-hidden rounded-[28px] border border-white/[0.1] bg-[#111113]/95 p-6 shadow-panel sm:p-8"
          >
            <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-1 rounded-full transition-all duration-500',
                      i === step ? 'w-7 bg-white' : i < step ? 'w-3 bg-white/40' : 'w-3 bg-white/[0.1]',
                    )}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/[0.06] hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-7 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.04] text-white/70">
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted">
              Шаг {step + 1} из 4
            </p>
            <h2 className="mt-2 font-display text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-[28px]">
              {current.title}
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{current.hint}</p>

            <div className="mt-6">
              {step === 0 ? (
                <Textarea
                  autoFocus
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Например: я встаю в 6:00, тренируюсь 4 раза в неделю и читаю 20 страниц в день."
                  className="h-32"
                />
              ) : null}

              {step === 1 ? (
                <Textarea
                  autoFocus
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                  placeholder="Например: хочу быть энергичным отцом и не откладывать жизнь на «потом»."
                  className="h-32"
                />
              ) : null}

              {step === 2 ? (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap gap-2">
                    {['Подъём в 6:00', 'Тренировка 45 минут', 'Чтение 20 страниц', 'Дневник вечером', 'Без сахара', '10 000 шагов', 'Медитация 10 мин'].map((item) => {
                      const active = picked.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setPicked((prev) => (active ? prev.filter((p) => p !== item) : [...prev, item]));
                          }}
                          className={cn(
                            'rounded-full border px-3.5 py-2 text-[12px] transition-all',
                            active
                              ? 'border-white/25 bg-white/[0.07] text-white'
                              : 'border-white/[0.1] text-muted hover:border-white/[0.2] hover:text-white',
                          )}
                        >
                          {active ? '✓ ' : ''}
                          {item}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={custom}
                      onChange={(e) => setCustom(e.target.value)}
                      placeholder="Своя тактика…"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && custom.trim()) {
                          e.preventDefault();
                          setPicked((prev) => [...prev, custom.trim()]);
                          setCustom('');
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (!custom.trim()) return;
                        setPicked((prev) => [...prev, custom.trim()]);
                        setCustom('');
                      }}
                      aria-label="Добавить тактику"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted">Выбрано: {picked.length}</p>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="label">Ваша цель</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-white/80">{goal || '—'}</p>
                    <p className="label mt-4">Зачем</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">{why || '—'}</p>
                    <p className="label mt-4">Тактики</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {picked.map((item) => (
                        <span key={item} className="rounded-full border border-white/[0.1] bg-white/[0.05] px-2.5 py-1 text-[10.5px] text-white/70">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playSound(commit ? 'click' : 'spark');
                      setCommit((v) => !v);
                    }}
                    className="flex w-full items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all',
                        commit ? 'border-primary bg-primary text-bg' : 'border-white/20 text-transparent',
                      )}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-[12.5px] leading-relaxed text-white/70">
                      Я выделяю 15 минут в день на отметки и не бросаю после первого пропуска.
                    </span>
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-7 flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))}
                className="px-4"
              >
                <ChevronLeft className="h-4 w-4" />
                {step === 0 ? 'Позже' : 'Назад'}
              </Button>
              <Button
                disabled={!canNext}
                onClick={() => {
                  playSound('click');
                  if (step < 3) {
                    setStep((s) => s + 1);
                  } else {
                    playSound('levelup');
                    onFinish({ goal, why, tactics: picked });
                  }
                }}
              >
                {step === 3 ? 'Начать квартал' : 'Далее'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ============================================================
   Экран трекера
   ============================================================ */

export default function TwelveWeeksPage() {
  const [week, setWeek] = useState(1);
  const [onboardingDone, setOnboardingDone] = usePersistentState<boolean>('lvs:12w:done', false);
  const [tactics, setTactics] = usePersistentState<Tactic[]>('lvs:12w:tactics', DEFAULT_TACTICS);
  const [progress, setProgress] = usePersistentState<Record<string, boolean>>('lvs:12w:progress', initialProgress());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newTactic, setNewTactic] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const [goal, setGoal] = usePersistentState<string>('lvs:12w:goal', 'Быть человеком, который делает, а не собирается.');

  useEffect(() => {
    if (!onboardingDone) {
      const timer = window.setTimeout(() => setShowOnboarding(true), 500);
      return () => window.clearTimeout(timer);
    }
  }, [onboardingDone]);

  const totalCells = tactics.length * 7;
  const doneCells = useMemo(
    () =>
      tactics.reduce(
        (sum, tactic) =>
          sum + DAYS.reduce((daySum, _, di) => daySum + (progress[`w${week}-${tactic.id}-d${di}`] ? 1 : 0), 0),
        0,
      ),
    [tactics, progress, week],
  );
  const score = totalCells ? Math.round((doneCells / totalCells) * 100) : 0;
  const weekDone = score >= 85;

  const toggle = (key: string) => {
    setProgress((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const nextDone = tactics.reduce(
        (sum, tactic) =>
          sum + DAYS.reduce((daySum, _, di) => daySum + (next[`w${week}-${tactic.id}-d${di}`] ? 1 : 0), 0),
        0,
      );
      const nextScore = totalCells ? Math.round((nextDone / totalCells) * 100) : 0;
      if (nextScore >= 85 && score < 85) {
        setCelebrate(true);
        window.setTimeout(() => setCelebrate(false), 3600);
        playSound('levelup');
      }
      return next;
    });
  };

  const addTactic = () => {
    if (!newTactic.trim()) return;
    const id = `t${Date.now()}`;
    setTactics((prev) => [...prev, { id, title: newTactic.trim(), icon: 'target' }]);
    setNewTactic('');
    setAddOpen(false);
    playSound('spark');
  };

  return (
    <AppShell>
      <Confetti show={celebrate} />
      <Onboarding
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onFinish={({ goal: nextGoal, tactics: picked }) => {
          setGoal(nextGoal || 'Быть лучшей версией себя.');
          const mapped = picked.map((title, index) => ({
            id: `p${index + 1}`,
            title,
            icon: index % 2 === 0 ? 'target' : 'leaf',
          }));
          if (mapped.length) setTactics(mapped);
          setOnboardingDone(true);
          setShowOnboarding(false);
          setWeek(1);
        }}
      />

      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        <PageHeader
          eyebrow={<Badge variant="pro">Система квартала</Badge>}
          title="Квартал"
          subtitle="Короткий горизонт, плотный прогресс. Отмечайте тактики каждый день — Score посчитается сам."
          actions={
            <>
              <Button variant="ghost" onClick={() => setShowOnboarding(true)}>
                <Sparkles className="h-4 w-4" /> Настроить заново
              </Button>
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> Тактика
              </Button>
            </>
          }
        />

        {/* Цель */}
        <Card className="relative mb-6 overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/[0.04] blur-3xl" />
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="label">Главная цель квартала</p>
              <p className="mt-1.5 max-w-2xl font-display text-[17px] font-bold leading-snug tracking-[-0.02em] text-white sm:text-xl">
                {goal}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="premium">
                  <Trophy className="h-2.5 w-2.5" /> Неделя {week} из 12
                </Badge>
                <span className="text-[11px] text-muted">{tactics.length} тактик · 7 дней</span>
              </div>
            </div>

            <div className="flex w-full shrink-0 items-center gap-4 lg:w-[320px]">
              <div className="flex-1">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted">Прогресс недели</span>
                  <span className="numeric text-[12px] font-semibold text-white">{score}%</span>
                </div>
                <Progress value={score} className="h-2" />
                <p className="mt-2 text-[10.5px] text-muted">
                  {doneCells} из {totalCells} отметок
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setWeek((w) => Math.max(1, w - 1))}
                  disabled={week === 1}
                  aria-label="Предыдущая неделя"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setWeek((w) => Math.min(12, w + 1))}
                  disabled={week === 12}
                  aria-label="Следующая неделя"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Полоса 12 недель */}
          <div className="mt-5 grid grid-cols-12 gap-1.5 border-t border-white/[0.06] pt-5">
            {Array.from({ length: 12 }).map((_, index) => {
              const n = index + 1;
              const active = n === week;
              const past = n < week;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWeek(n)}
                  className={cn(
                    'group flex flex-col items-center gap-1.5 rounded-lg py-1 transition-colors',
                    active ? 'text-white' : past ? 'text-white/60' : 'text-white/25',
                  )}
                  aria-label={`Неделя ${n}`}
                >
                  <span
                    className={cn(
                      'h-1.5 w-full rounded-full transition-all',
                      active
                        ? 'bg-white'
                        : past
                          ? 'bg-white/30'
                          : 'bg-white/[0.08] group-hover:bg-white/[0.16]',
                    )}
                  />
                  <span className="numeric text-[9px]">{n}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
          {/* Таблица тактик */}
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="label">Неделя {week}</p>
                <h2 className="mt-1.5 font-display text-xl font-bold tracking-[-0.02em] text-white">
                  Тактики и дни
                </h2>
              </div>
              <div className="flex items-center gap-2 text-[10.5px] text-muted">
                <span className="h-2 w-2 rounded-full bg-primary" /> выполнено
              </div>
            </div>

            <div className="overflow-x-auto pb-1">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr>
                    <th className="pb-3 text-left text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted">
                      Тактика
                    </th>
                    {DAYS.map((day, index) => (
                      <th key={day} className="w-12 pb-3 text-center" title={DAYS_FULL[index]}>
                        <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                          {day}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tactics.map((tactic, index) => {
                    const Icon = ICONS[tactic.icon] || Target;
                    return (
                      <motion.tr
                        key={tactic.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04, duration: 0.3 }}
                        className="group border-t border-white/[0.05]"
                      >
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-primary/80">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-[12.5px] font-medium text-white/90">{tactic.title}</span>
                          </div>
                        </td>
                        {DAYS.map((day, di) => {
                          const key = `w${week}-${tactic.id}-d${di}`;
                          const isDone = Boolean(progress[key]);
                          return (
                            <td key={day} className="py-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  playSound(isDone ? 'click' : 'spark');
                                  toggle(key);
                                }}
                                aria-pressed={isDone}
                                aria-label={`${tactic.title}, ${DAYS_FULL[di]}`}
                                className={cn(
                                  'mx-auto flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-300 active:scale-90',
                                  isDone
                                    ? 'border-primary bg-primary text-bg shadow-[0_0_16px_-2px_rgba(168,255,53,0.7)]'
                                    : 'border-white/[0.12] bg-white/[0.02] text-transparent hover:border-primary/40 hover:bg-primary/[0.04]',
                                )}
                              >
                                {isDone ? (
                                  <svg
                                    className="animate-check-draw h-3 w-3"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden
                                  >
                                    <polyline points="20 6 9 17 4 12" style={{ strokeDasharray: 24 }} />
                                  </svg>
                                ) : (
                                  <span className="h-1 w-1 rounded-full bg-white/20" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
              <p className="text-[11px] text-muted">Данные сохраняются на этом устройстве</p>
              <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Добавить
              </Button>
            </div>
          </Card>

          {/* Score */}
          <div className="space-y-6">
            <Card
              className={cn(
                'relative overflow-hidden p-6',
                weekDone && 'border-white/[0.16]',
              )}
            >
              <div
                className={cn(
                  'pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl',
                  weekDone ? 'bg-primary/[0.08]' : 'bg-white/[0.04]',
                )}
              />
              <div className="flex items-start justify-between">
                <div>
                  <p className="label">Ваш Score</p>
                  <h2 className="mt-1.5 font-display text-xl font-bold tracking-[-0.02em] text-white">
                    Неделя {week}
                  </h2>
                </div>
                {weekDone ? (
                  <Badge variant="pro">
                    <Sparkles className="h-2.5 w-2.5" /> Цель
                  </Badge>
                ) : (
                  <Badge variant="free">В процессе</Badge>
                )}
              </div>

              <div className="mt-6 flex items-center gap-5">
                <div className="relative h-28 w-28 shrink-0">
                  <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90">
                    <circle cx="56" cy="56" r="46" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                    <motion.circle
                      cx="56"
                      cy="56"
                      r="46"
                      fill="none"
                      stroke={weekDone ? '#A8FF35' : 'rgba(255,255,255,0.55)'}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 46}
                      initial={{ strokeDashoffset: 2 * Math.PI * 46 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 46 * (1 - score / 100) }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      style={{ filter: weekDone ? 'drop-shadow(0 0 8px rgba(168,255,53,0.6))' : undefined }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="numeric font-display text-[30px] font-extrabold leading-none text-white">{score}</span>
                    <span className="mt-1 text-[9px] uppercase tracking-[0.16em] text-muted">из 100</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] leading-relaxed text-muted">
                    {weekDone
                      ? 'Отличная неделя. Выше 85% — это уже не случайность, а система.'
                      : score >= 60
                        ? 'Хороший темп. Ещё немного — и неделя закроется.'
                        : 'Начните с одной отметки. Дальше включается инерция.'}
                  </p>
                  <p className="mt-3 text-[10.5px] text-white/35">Порог успеха — 85%</p>
                </div>
              </div>

              <div className="mt-5">
                <Button
                  className="w-full"
                  variant={weekDone ? 'primary' : 'ghost'}
                  onClick={() => {
                    if (weekDone) {
                      setCelebrate(true);
                      window.setTimeout(() => setCelebrate(false), 3600);
                      playSound('levelup');
                    } else {
                      playSound('error');
                    }
                  }}
                >
                  {weekDone ? (
                    <>
                      <Trophy className="h-4 w-4" /> Отпраздновать неделю
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4" /> Ещё{' '}
                      {Math.max(0, Math.ceil(((85 - score) * totalCells) / 100))}{' '}
                      {plural(Math.max(0, Math.ceil(((85 - score) * totalCells) / 100)), 'отметка', 'отметки', 'отметок')}{' '}
                      до цели
                    </>
                  )}
                </Button>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <p className="label">Итоги квартала</p>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Закрыто недель', value: `${Math.max(0, week - 1)} / 12` },
                  { label: 'Лучший Score', value: '94' },
                  { label: 'Серия отметок', value: `${Math.max(3, doneCells)}` },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between border-b border-white/[0.05] pb-3 last:border-0 last:pb-0">
                    <span className="text-[12px] text-muted">{row.label}</span>
                    <span className="numeric text-[12.5px] font-semibold text-white">{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" href="/tracker" asChild>
            <span>
              <ArrowLeft className="h-4 w-4" /> Все трекеры
            </span>
          </Button>
          <Button variant="ghost" href="/journal" asChild>
            <span>
              Дневник недели <ArrowRight className="h-4 w-4" />
            </span>
          </Button>
        </div>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Новая тактика"
        subtitle="Маленькое действие, которое можно повторить 7 дней подряд."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Отмена
            </Button>
            <Button onClick={addTactic} disabled={!newTactic.trim()}>
              Добавить
            </Button>
          </div>
        }
      >
        <Input
          autoFocus
          value={newTactic}
          onChange={(e) => setNewTactic(e.target.value)}
          placeholder="Например: 10 минут медитации"
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTactic();
          }}
        />
      </Modal>
    </AppShell>
  );
}
