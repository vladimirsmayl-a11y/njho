'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Award,
  Check,
  CheckCircle2,
  Flame,
  Sparkles,
  Target,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AppShell,
  Avatar,
  Badge,
  Button,
  Card,
  Modal,
  Progress,
  TierBadge,
  playSound,
} from '@/components/ui';
import { MarathonCover } from '@/components/marathon-cover';
import { api } from '@/lib/api';
import { demoFriends, demoMarathons } from '@/lib/demo';
import { cn } from '@/lib/utils';

type HeatCell = { date: string; percent: number; level: number };

type FriendProfile = {
  id: string;
  username: string;
  avatar_url?: string | null;
  tier: string;
  streak: number;
  completed_tasks: number;
  rank: string;
  average_result: number;
  active_days: number;
  heatmap: HeatCell[];
  marathons: { id: number | string; title: string; starts_on?: string; ends_on?: string }[];
};

const ACHIEVEMENTS = [
  { title: 'Месяц без пропусков', icon: Flame, date: '12 окт', accent: 'text-[#FF5A36]' },
  { title: '100 заданий', icon: CheckCircle2, date: '28 сен', accent: 'text-[#7FC8FF]' },
  { title: 'Марафон закрыт', icon: Trophy, date: '4 сен', accent: 'text-premium' },
  { title: 'Ранний подъём ×30', icon: Sparkles, date: '19 авг', accent: 'text-[#B388FF]' },
];

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Номер ISO-недели — подписываем столбцы честными номерами, а не индексами. */
function isoWeek(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function demoHeatmap(streak: number): HeatCell[] {
  return Array.from({ length: 84 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (83 - index));
    const seed = (index * 37 + streak * 13) % 100;
    const level = seed > 76 ? 4 : seed > 52 ? 3 : seed > 28 ? 2 : seed > 12 ? 1 : 0;
    return { date: isoDate(date), percent: level * 25, level };
  });
}

function levelClass(level: number) {
  return level >= 4
    ? 'bg-white'
    : level === 3
      ? 'bg-white/40'
      : level === 2
        ? 'bg-white/20'
        : level === 1
          ? 'bg-white/[0.09]'
          : 'bg-white/[0.035]';
}

export default function FriendProfilePage({ params }: { params: { id: string } }) {
  const fallbackFriend = demoFriends.find((item) => item.id === params.id) || demoFriends[0];
  const [profile, setProfile] = useState<FriendProfile>({
    id: fallbackFriend.id,
    username: fallbackFriend.username,
    avatar_url: null,
    tier: fallbackFriend.tier,
    streak: fallbackFriend.streak,
    completed_tasks: fallbackFriend.completed_tasks,
    rank: fallbackFriend.rank,
    average_result: 82,
    active_days: 63,
    heatmap: demoHeatmap(fallbackFriend.streak),
    marathons: [],
  });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invited, setInvited] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const remote = await api<FriendProfile>(`/friends/${params.id}`);
        if (alive && remote && remote.username) {
          setProfile({
            ...remote,
            heatmap: Array.isArray(remote.heatmap) && remote.heatmap.length ? remote.heatmap : demoHeatmap(remote.streak ?? 0),
          });
        }
      } catch {
        /* демо-режим */
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.id]);

  /** 12 недель × 7 дней: выравниваем по понедельнику, чтобы столбцы читались. */
  const weeks = useMemo(() => {
    const cells = profile.heatmap.length ? profile.heatmap : demoHeatmap(profile.streak);
    const byDate = new Map(cells.map((cell) => [cell.date, cell]));
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const weekday = (today.getDay() + 6) % 7; // 0 = понедельник
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - weekday));
    const start = new Date(end);
    start.setDate(start.getDate() - 83);

    return Array.from({ length: 12 }).map((_, weekIndex) => {
      const days = Array.from({ length: 7 }).map((__, dayIndex) => {
        const date = new Date(start);
        date.setDate(start.getDate() + weekIndex * 7 + dayIndex);
        const iso = isoDate(date);
        const cell = byDate.get(iso);
        return {
          iso,
          level: cell?.level ?? 0,
          percent: cell?.percent ?? 0,
          future: date.getTime() > today.getTime(),
        };
      });
      return { number: isoWeek(days[0] ? new Date(days[0].iso) : new Date()), days };
    });
  }, [profile.heatmap, profile.streak]);

  const bestWeek = useMemo(() => {
    const totals = weeks.map((week) => {
      const active = week.days.filter((day) => !day.future && day.level > 0);
      return active.length ? Math.round(active.reduce((sum, day) => sum + day.percent, 0) / active.length) : 0;
    });
    return Math.max(0, ...totals);
  }, [weeks]);

  const invite = (marathonId: string) => {
    setInvited((prev) => [...prev, marathonId]);
    playSound('spark');
  };

  const marathons = profile.marathons.length
    ? profile.marathons
    : demoMarathons.slice(0, 4).map((marathon) => ({
        id: marathon.id,
        title: marathon.title,
        starts_on: marathon.start_date,
        ends_on: undefined,
      }));

  return (
    <AppShell>
      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        <Link
          href="/friends"
          className="mb-5 inline-flex items-center gap-2 text-[11.5px] text-muted transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Назад к друзьям
        </Link>

        {/* Профиль: баннер и аватар не перекрывают имя */}
        <Card className="relative overflow-hidden">
          <div className="relative h-24 bg-gradient-to-br from-[#1a1a1c] via-[#121214] to-[#0a0a0a] sm:h-28">
            <div
              aria-hidden
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 18% 30%, rgba(255,90,54,0.14), transparent 42%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1), transparent 45%)',
              }}
            />
            <div className="absolute inset-0 grid-lines opacity-40" aria-hidden />
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <TierBadge tier={profile.tier} />
              <Badge variant="pro">
                <span className="h-1.5 w-1.5 rounded-full bg-[#A8FF35]" /> в вашем круге
              </Badge>
            </div>
          </div>

          <div className="px-5 pb-5 sm:px-7 sm:pb-6">
            <div className="relative z-10 -mt-9 flex items-end gap-4">
              <div className="shrink-0 rounded-full border-4 border-[#141416] bg-[#141416]">
                <Avatar src={profile.avatar_url} size={80} fallback={profile.username} ring />
              </div>
              <div className="min-w-0 pb-1">
                <h1 className="truncate font-display text-[22px] font-extrabold tracking-[-0.03em] text-white sm:text-[28px]">
                  {profile.username}
                </h1>
                <p className="mt-0.5 truncate text-[11.5px] text-muted">
                  {profile.rank} · в платформе с марта 2025
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="ghost" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4" /> Пригласить в марафон
              </Button>
              <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[10.5px] text-muted">
                <Users className="h-3.5 w-3.5" />
                Открытый профиль
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Серия', value: `${profile.streak}`, suffix: 'дней', icon: Flame, accent: 'text-[#FF5A36]' },
                { label: 'Заданий', value: `${profile.completed_tasks}`, suffix: 'всего', icon: CheckCircle2, accent: 'text-[#7FC8FF]' },
                { label: 'Звание', value: profile.rank, suffix: 'уровень', icon: Trophy, accent: 'text-premium' },
                { label: 'Средний результат', value: `${profile.average_result}%`, suffix: 'за 12 недель', icon: Target, accent: 'text-white/70' },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.35 }}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5"
                  >
                    <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.14em] text-muted">
                      <Icon className={cn('h-3 w-3', item.accent)} /> {item.label}
                    </div>
                    <p className="numeric mt-2 truncate font-display text-[20px] font-extrabold leading-none text-white">
                      {item.value}
                    </p>
                    <p className="mt-1 text-[9.5px] text-muted">{item.suffix}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            {/* Активность: компактная карта 12 недель с номерами недель */}
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="label">Активность</p>
                  <h2 className="mt-1.5 font-display text-lg font-bold text-white">Последние 12 недель</h2>
                </div>
                <div className="flex items-center gap-2 text-[9.5px] text-muted">
                  <span>Меньше</span>
                  <div className="flex items-center gap-[3px]">
                    {[0, 1, 2, 3, 4].map((level) => (
                      <span key={level} className={cn('h-2.5 w-2.5 rounded-[2px]', levelClass(level))} />
                    ))}
                  </div>
                  <span>Больше</span>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto pb-1">
                <div className="min-w-[300px]">
                  {/* Номера недель */}
                  <div className="mb-1.5 grid grid-cols-[18px_repeat(12,minmax(0,1fr))] gap-[3px]">
                    <span />
                    {weeks.map((week, index) => (
                      <span
                        key={`${week.number}-${index}`}
                        className="numeric text-center text-[8.5px] leading-none text-white/25"
                        title={`Неделя ${week.number}`}
                      >
                        {week.number}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-[18px_repeat(12,minmax(0,1fr))] gap-[3px]">
                    {DAY_LABELS.map((label, dayIndex) => (
                      <div key={label} className="contents">
                        <span className="flex h-full items-center text-[8.5px] text-white/25">
                          {dayIndex % 2 === 0 ? label : ''}
                        </span>
                        {weeks.map((week, weekIndex) => {
                          const day = week.days[dayIndex];
                          return (
                            <span
                              key={`${weekIndex}-${dayIndex}`}
                              title={`${day.iso} · ${day.percent}%`}
                              className={cn(
                                'aspect-square w-full rounded-[2px] transition-colors',
                                day.future ? 'bg-white/[0.015]' : levelClass(day.level),
                              )}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-3">
                <div>
                  <p className="label">Средний результат</p>
                  <p className="numeric mt-1 text-[18px] font-bold text-white">{profile.average_result}%</p>
                </div>
                <div>
                  <p className="label">Лучшая неделя</p>
                  <p className="numeric mt-1 text-[18px] font-bold text-white">{bestWeek}%</p>
                </div>
                <div>
                  <p className="label">Активных дней</p>
                  <p className="numeric mt-1 text-[18px] font-bold text-white">{profile.active_days}</p>
                </div>
              </div>
            </Card>

            {/* Достижения */}
            <Card className="p-5 sm:p-6">
              <p className="label">Звания и награды</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {ACHIEVEMENTS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5"
                    >
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]', item.accent)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-white">{item.title}</p>
                        <p className="text-[10px] text-muted">получено {item.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Правая колонка */}
          <div className="space-y-6">
            <Card className="p-5 sm:p-6">
              <p className="label">Марафоны</p>
              <div className="mt-4 space-y-3">
                {marathons.slice(0, 2).map((marathon, index) => (
                  <div key={`${marathon.id}-${index}`} className="flex items-center gap-3">
                    <MarathonCover icon="sunrise" size="sm" className="w-16 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold text-white">{marathon.title}</p>
                      <p className="text-[10px] text-muted">
                        {marathon.ends_on ? `до ${marathon.ends_on}` : 'активный марафон'}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={58 + index * 12} className="h-1 flex-1" />
                        <span className="numeric text-[9.5px] text-white/50">{58 + index * 12}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <Check className="h-3.5 w-3.5 text-white/40" />
                <p className="text-[10.5px] text-muted">Задания проверяет куратор марафона</p>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-premium" />
                <p className="label">Звание</p>
              </div>
              <p className="mt-3 font-display text-[20px] font-extrabold tracking-[-0.02em] text-white">
                {profile.rank}
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                Уровень определяется серией и числом закрытых заданий. До следующего звания — 14 дней.
              </p>
              <div className="mt-4">
                <Progress value={72} />
                <p className="mt-2 text-[10px] text-muted">72% до «Легенды»</p>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-white/50" />
                <p className="label">Общий круг</p>
              </div>
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
                Прогресс и серии видны участникам вашего круга. Пригласите друга в марафон — и
                двигайтесь вместе.
              </p>
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Пригласить в марафон"
        subtitle={`${profile.username} получит приглашение в интерфейсе.`}
      >
        <div className="space-y-2">
          {marathons.slice(0, 4).map((marathon, index) => {
            const key = String(marathon.id);
            const isInvited = invited.includes(key);
            return (
              <div
                key={`${key}-${index}`}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3"
              >
                <MarathonCover icon="sunrise" size="sm" className="h-14 w-16 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-white">{marathon.title}</p>
                  <p className="text-[10px] text-muted">
                    {marathon.starts_on ? `старт ${marathon.starts_on}` : 'активный марафон'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isInvited ? 'ghost' : 'soft'}
                  onClick={() => invite(key)}
                  disabled={isInvited}
                >
                  {isInvited ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-white" /> Отправлено
                    </>
                  ) : (
                    'Пригласить'
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </Modal>
    </AppShell>
  );
}
