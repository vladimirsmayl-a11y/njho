'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flame,
  Gauge,
  Trophy,
  TrendingUp,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AppShell,
  Badge,
  Button,
  Card,
  PageHeader,
  Progress,
  playSound,
  toast,
} from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { api, body, errorText } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import {
  averageScore,
  lastDays,
  loadTempo,
  shortDate,
  tempoMeta,
  tempoZone,
  type TempoMap,
} from '@/lib/tempo';
import { cn, plural } from '@/lib/utils';

type TaskStat = {
  total_done: number;
  total_tasks: number;
  closed_days?: number;
  streak?: number;
  best_streak?: number;
};
type MarathonStat = {
  id: number | string;
  title: string;
  progress: number;
  status: 'active' | 'completed' | 'joined';
};
type Achievement = {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  earned_at?: string | null;
};

export default function StatsPage() {
  const { user, demo, loading } = useAuth();
  const { t } = useI18n();
  const [taskStat, setTaskStat] = useState<TaskStat>({ total_done: 0, total_tasks: 0 });
  const [marathons, setMarathons] = useState<MarathonStat[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [tempo, setTempo] = useState<TempoMap>({});
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    setTempo(loadTempo());
  }, []);

  useEffect(() => {
    if (loading) return;
    let alive = true;
    (async () => {
      try {
        if (demo) {
          setTaskStat({ total_done: 419, total_tasks: 450 });
          setStreak(1);
          setBestStreak(23);
          setMarathons([
            { id: 'm-1', title: 'Утренний подъём', progress: 72, status: 'active' },
            { id: 'm-2', title: 'Глубокая работа', progress: 40, status: 'joined' },
            { id: 'm-3', title: 'Сильное тело', progress: 100, status: 'completed' },
          ]);
          setAchievements([
            { id: 'a1', title: '«Первый шаг»', description: 'Закрыт первый день полностью', earned: true, earned_at: 'неделю назад' },
            { id: 'a2', title: '«Неделя без пропусков»', description: '7 дней подряд', earned: true, earned_at: '3 дня назад' },
            { id: 'a3', title: '«Месяц без пропусков»', description: '30 дней подряд', earned: false },
          ]);
        } else {
          const [statResp, marathonResp] = await Promise.all([
            api<TaskStat>('/stats/tasks'),
            api<MarathonStat[]>('/stats/marathons'),
          ]);
          setTaskStat(statResp);
          setMarathons(Array.isArray(marathonResp) ? marathonResp : []);
          setStreak(statResp.streak ?? 0);
          setBestStreak(statResp.best_streak ?? 0);
          const ach = await api<Achievement[]>('/stats/achievements');
          setAchievements(Array.isArray(ach) ? ach : []);
        }
      } catch (error) {
        toast('Не удалось загрузить статистику', { description: errorText(error), tone: 'danger' });
      } finally {
        if (alive) setLoadingStats(false);
      }
    })();
    return () => { alive = false; };
  }, [loading, demo, user?.id]);

  const donePercent = taskStat.total_tasks
    ? Math.round((taskStat.total_done / taskStat.total_tasks) * 100)
    : 0;

  const tempoDays = useMemo(
    () => lastDays(14).map((day) => ({ day, score: tempo[day] })),
    [tempo],
  );
  const tempoAverage = useMemo(() => averageScore(tempo, 30), [tempo]);
  const tempoProductive = useMemo(
    () =>
      lastDays(30).filter((day) => {
        const score = tempo[day];
        return typeof score === 'number' && score <= 4;
      }).length,
    [tempo],
  );
  const chartPoints = useMemo(
    () =>
      tempoDays.map(({ score }, index) => ({
        x: (index / Math.max(1, tempoDays.length - 1)) * 600,
        y: typeof score === 'number' ? 14 + ((score - 1) / 11) * 132 : null,
        score,
      })),
    [tempoDays],
  );
  const linePath = useMemo(() => {
    const points = chartPoints.filter((point) => point.y !== null);
    if (points.length < 2) return '';
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${(point.y as number).toFixed(1)}`)
      .join(' ');
  }, [chartPoints]);
  const areaPath = useMemo(() => {
    const points = chartPoints.filter((point) => point.y !== null);
    if (points.length < 2) return '';
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L ${last.x.toFixed(1)} 160 L ${first.x.toFixed(1)} 160 Z`;
  }, [chartPoints, linePath]);
  const tempoToday = tempoDays[tempoDays.length - 1]?.score;
  const tempoTodayMeta = typeof tempoToday === 'number' ? tempoMeta[tempoZone(tempoToday)] : null;

  return (
    <AppShell>
      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        <Link
          href="/tracker"
          className="mb-5 inline-flex items-center gap-2 text-[11.5px] text-muted transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Назад в трекеры
        </Link>

        <PageHeader
          title="Статистика"
          subtitle="Ваш общий прогресс по задачам, серии и марафонам в одном месте."
        />

        {/* Ключевые показатели */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <motion.div
            key="kpi-tasks"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 sm:p-6"
          >
            <Card className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label">Выполнено задач</p>
                  <p className="numeric mt-2 font-display text-[30px] font-extrabold leading-none text-white">
                    {taskStat.total_done}
                  </p>
                  <p className="mt-1 text-[10px] text-muted">
                    {donePercent}% от {taskStat.total_tasks}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.08] text-primary">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            key="kpi-streak"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="p-5 sm:p-6"
          >
            <Card className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label">Серия огонька</p>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="numeric font-display text-[30px] font-extrabold leading-none text-[#FF5A36]">
                      {streak}
                    </span>
                    <span className="text-[11px] text-white/50">
                      {plural(streak, 'день', 'дня', 'дней')}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-white/50">
                    Лучшая: {bestStreak} {plural(bestStreak, 'день', 'дня', 'дней')}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FF5A36]/20 bg-[#FF5A36]/[0.08] text-[#FF5A36]">
                  <Flame className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            key="kpi-marathons"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="p-5 sm:p-6"
          >
            <Card className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label">Марафоны</p>
                  <p className="numeric mt-2 font-display text-[30px] font-extrabold leading-none text-white">
                    {marathons.length}
                  </p>
                  <p className="mt-1 text-[10px] text-muted">
                    {marathons.filter((m) => m.status === 'active').length} активных
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-premium/20 bg-premium/[0.08] text-premium">
                  <Trophy className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            key="kpi-achievements"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="p-5 sm:p-6"
          >
            <Card className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label">Достижения</p>
                  <p className="numeric mt-2 font-display text-[30px] font-extrabold leading-none text-white">
                    {achievements.filter((a) => a.earned).length}
                  </p>
                  <p className="mt-1 text-[10px] text-muted">
                    из {achievements.length}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FF9EC4]/20 bg-[#FF9EC4]/[0.08] text-[#FF9EC4]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Темп дня — линейный график за 14 дней */}
        <section className="mt-6">
          <Card className="relative overflow-hidden p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/[0.05] blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="label flex items-center gap-2">
                  <Gauge className="h-3.5 w-3.5 text-white/30" /> Темп дня
                </p>
                <h2 className="mt-1.5 font-display text-lg font-bold tracking-[-0.02em] text-white">
                  Ритм последних 14 дней
                </h2>
                <p className="mt-1 text-[11px] text-muted">
                  Чем выше линия — тем продуктивнее день. Оценка от 1 до 12.
                </p>
              </div>
              <div className="flex items-center gap-5">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-white/30">Средний темп</p>
                  <p className="numeric mt-1 font-display text-[22px] font-extrabold leading-none text-white">
                    {tempoAverage ? tempoAverage.toFixed(1) : '—'}
                    <span className="ml-1 text-[10px] font-medium text-white/30">/ 12</span>
                  </p>
                </div>
                <div className="h-9 w-px bg-white/[0.07]" />
                <div>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-white/30">Продуктивных</p>
                  <p className="numeric mt-1 font-display text-[22px] font-extrabold leading-none text-white">
                    {tempoProductive}
                    <span className="ml-1 text-[10px] font-medium text-white/30">из 30</span>
                  </p>
                </div>
                <div className="h-9 w-px bg-white/[0.07]" />
                <div>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-white/30">Сегодня</p>
                  <p className={cn('mt-1 font-display text-[13px] font-bold leading-tight', tempoTodayMeta ? tempoTodayMeta.text : 'text-white/30')}>
                    {tempoTodayMeta ? tempoTodayMeta.label : 'Нет оценки'}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative mt-6">
              <svg viewBox="0 0 600 180" className="h-[170px] w-full overflow-visible" role="img" aria-label="График темпа дня за 14 дней">
                <defs>
                  <linearGradient id="tempoArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A8FF35" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#A8FF35" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((line) => (
                  <line
                    key={line}
                    x1="0"
                    x2="600"
                    y1={14 + line * 44}
                    y2={14 + line * 44}
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="4 6"
                  />
                ))}
                {areaPath ? <path d={areaPath} fill="url(#tempoArea)" /> : null}
                {linePath ? (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#A8FF35"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: 'drop-shadow(0 4px 12px rgba(168,255,53,0.35))' }}
                  />
                ) : null}
                {chartPoints.map((point, index) =>
                  point.y !== null ? (
                    <circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r={index === chartPoints.length - 1 ? 4 : 2.6}
                      fill={index === chartPoints.length - 1 ? '#A8FF35' : '#0A0A0A'}
                      stroke="#A8FF35"
                      strokeWidth="2"
                    />
                  ) : null,
                )}
              </svg>
              <div className="mt-1 flex justify-between text-[9px] uppercase tracking-[0.1em] text-white/25">
                <span>{shortDate(tempoDays[0]?.day ?? '')}</span>
                <span>{shortDate(tempoDays[Math.floor(tempoDays.length / 2)]?.day ?? '')}</span>
                <span>Сегодня</span>
              </div>
            </div>

            <div className="relative mt-5 flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-4 text-[10px] text-white/35">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> 1–4 · продуктивно
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/45" /> 5–8 · ровно
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#FF6B4A]" /> 9–12 · лень
              </span>
              <Link
                href="/tracker/tempo"
                className="ml-auto inline-flex items-center gap-1 text-white/45 transition hover:text-white"
              >
                Оценить день <Clock className="h-3 w-3" />
              </Link>
            </div>
          </Card>
        </section>

        {/* Марафоны пользователя */}
        <section className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="label">Ваши марафоны</p>
              <h2 className="mt-1 font-display text-lg font-bold tracking-[-0.02em] text-white">
                Прогресс в программах
              </h2>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {marathons.length ? (
              marathons.map((m) => (
                <Card key={m.id} className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[14px] font-bold text-white">{m.title}</p>
                      <p className="mt-0.5 text-[10.5px] text-muted">
                        {m.status === 'active' ? 'Участвуете' : m.status === 'completed' ? 'Завершён' : 'Записаны'}
                      </p>
                    </div>
                    <span className="numeric text-[12px] font-semibold text-white">{m.progress}%</span>
                  </div>
                  <div className="mt-3">
                    <Progress value={m.progress} className="h-1.5" />
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-10 text-center">
                <Users className="mx-auto h-8 w-8 text-muted" />
                <p className="mt-3 font-medium text-white">Участия в марафонах пока нет</p>
                <p className="mt-1 text-[11px] text-muted">
                  Присоединяйтесь к программе в разделе «Марафоны».
                </p>
              </Card>
            )}
          </div>
        </section>

        {/* Достижения */}
        <section className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="label">Достижения</p>
              <h2 className="mt-1 font-display text-lg font-bold tracking-[-0.02em] text-white">
                Полученные награды
              </h2>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {achievements.length ? (
              achievements.map((a) => (
                <Card
                  key={a.id}
                  className={cn(
                    'p-4 sm:p-5 transition-colors',
                    a.earned ? 'border-white/[0.12] bg-white/[0.03]' : 'border-white/[0.06] bg-white/[0.02] opacity-70 grayscale',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-premium/20 bg-premium/[0.08] text-premium">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <p className="mt-2 font-display text-[13px] font-bold text-white">
                        {a.title}
                      </p>
                      <p className="mt-1 text-[11px] text-muted">{a.description}</p>
                    </div>
                    <Badge variant={a.earned ? 'premium' : 'free'}>
                      {a.earned ? 'Получено' : 'В процессе'}
                    </Badge>
                  </div>
                  {a.earned_at && (
                    <p className="mt-3 text-[10px] text-white/40">Получено {a.earned_at}</p>
                  )}
                </Card>
              ))
            ) : (
              <Card className="p-10 text-center">
                <Trophy className="mx-auto h-8 w-8 text-muted" />
                <p className="mt-3 font-medium text-white">Достижения пока не получены</p>
                <p className="mt-1 text-[11px] text-muted">
                  Закрывайте дни и выполняйте задачи, чтобы получать награды.
                </p>
              </Card>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
