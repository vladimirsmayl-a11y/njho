'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
  Gauge,
  Target,
  Trophy,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AppShell, Badge, Card, PageHeader, Progress } from '@/components/ui';

const TRACKERS = [
  {
    href: '/tracker/12-weeks',
    title: 'Квартал',
    description: 'Главная система: цель на квартал, тактики и Score каждую неделю.',
    icon: CalendarDays,
    accent: 'text-primary',
    border: 'border-primary/20',
    bg: 'bg-primary/[0.06]',
    meta: 'Неделя 1 из 12',
    progress: 86,
    badge: 'Активен',
    featured: true,
  },
  {
    href: '/tracker/tempo',
    title: 'Темп дня',
    description: 'Оценка 1–12 каждый вечер и график продуктивности за 30 дней.',
    icon: Gauge,
    accent: 'text-[#C7B8FF]',
    border: 'border-[#C7B8FF]/20',
    bg: 'bg-[#C7B8FF]/[0.06]',
    meta: 'Среднее 4.8 за месяц',
    progress: 60,
    badge: 'Ежедневно',
  },
  {
    href: '/journal',
    title: 'Дневник',
    description: 'Короткая рефлексия вечером: три победы и один урок дня.',
    icon: BookOpen,
    accent: 'text-[#7FC8FF]',
    border: 'border-[#7FC8FF]/20',
    bg: 'bg-[#7FC8FF]/[0.06]',
    meta: '12 записей',
    progress: 64,
    badge: 'Ежедневно',
  },
  {
    href: '/marathons',
    title: 'Марафоны',
    description: 'Групповые челленджи с куратором, заданиями и чатом.',
    icon: Trophy,
    accent: 'text-premium',
    border: 'border-premium/20',
    bg: 'bg-premium/[0.06]',
    meta: '2 активных',
    progress: 48,
    badge: 'Pro',
  },
  {
    href: '/dashboard',
    title: 'Привычки дня',
    description: 'Ежедневный список действий, заморозки и огонёк серии.',
    icon: Flame,
    accent: 'text-[#FF8A65]',
    border: 'border-[#FF8A65]/20',
    bg: 'bg-[#FF8A65]/[0.06]',
    meta: '5 из 7 сегодня',
    progress: 71,
    badge: 'Каждый день',
  },
  {
    href: '/knowledge',
    title: 'База знаний',
    description: 'Короткие материалы о сне, спорте, питании и дисциплине.',
    icon: Target,
    accent: 'text-white',
    border: 'border-white/[0.1]',
    bg: 'bg-white/[0.04]',
    meta: '42 статьи',
    progress: 32,
    badge: 'Библиотека',
  },
  {
    href: '/friends',
    title: 'Круг поддержки',
    description: 'Друзья, их серии и совместные приглашения в марафоны.',
    icon: CheckCircle2,
    accent: 'text-[#B388FF]',
    border: 'border-[#B388FF]/20',
    bg: 'bg-[#B388FF]/[0.06]',
    meta: '6 друзей',
    progress: 54,
    badge: 'Сообщество',
  },
];

export default function TrackersPage() {
  return (
    <AppShell>
      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        <PageHeader
          eyebrow={<Badge variant="pro">Экосистема роста</Badge>}
          title="Трекеры"
          subtitle="Семь инструментов, которые работают вместе. Начните с Квартала — остальное подстроится."
          actions={
            <Link
              href="/tracker/12-weeks"
              className="btn btn-primary"
            >
              Открыть Квартал <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        />

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {TRACKERS.map((tracker, index) => {
            const Icon = tracker.icon;
            return (
              <motion.div
                key={tracker.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.45 }}
              >
                <Link href={tracker.href} className="block h-full">
                  <Card
                    hover
                    glow
                    className={`group h-full overflow-hidden p-5 sm:p-6 ${tracker.featured ? 'border-primary/25' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${tracker.border} ${tracker.bg} ${tracker.accent}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant={tracker.featured ? 'pro' : tracker.badge === 'Pro' ? 'premium' : 'free'}>
                        {tracker.badge}
                      </Badge>
                    </div>

                    <h2 className="mt-5 font-display text-[17px] font-bold tracking-[-0.02em] text-white">
                      {tracker.title}
                    </h2>
                    <p className="mt-2 min-h-[40px] text-[12.5px] leading-relaxed text-muted">
                      {tracker.description}
                    </p>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10.5px] text-muted">{tracker.meta}</span>
                        <span className="numeric text-[10.5px] font-semibold text-white/70">{tracker.progress}%</span>
                      </div>
                      <Progress value={tracker.progress} className="h-1" />
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
                      <span className="text-[10.5px] uppercase tracking-[0.14em] text-white/30">Открыть</span>
                      <ArrowUpRight className="h-4 w-4 text-white/25 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <Card className="mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.08] text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">15 минут в день — и система работает</p>
              <p className="text-[11.5px] text-muted">Отметки, рефлексия и один короткий материал. Без перегрузки.</p>
            </div>
          </div>
          <Link href="/dashboard" className="btn btn-ghost shrink-0">
            На сегодня
          </Link>
        </Card>
      </div>
    </AppShell>
  );
}
