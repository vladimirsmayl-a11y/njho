'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Flame,
  Plus,
  Search,
  Trophy,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AppShell, Badge, Button, Card, PageHeader, Progress, TierBadge } from '@/components/ui';
import { MarathonCover } from '@/components/marathon-cover';
import { api } from '@/lib/api';
import { demoMarathons } from '@/lib/demo';
import { loadStoredMarathons } from '@/lib/marathons';
import { cn } from '@/lib/utils';

type Marathon = (typeof demoMarathons)[number] & {
  cover_image?: string | null;
  limit?: number;
  tasks?: string[];
};

const FILTERS = ['Все', 'Мои', 'Pro', 'Premium'];

export default function MarathonsPage() {
  const [marathons, setMarathons] = useState<Marathon[]>(demoMarathons);
  const [filter, setFilter] = useState('Все');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const stored = loadStoredMarathons();
    if (stored.length) {
      setMarathons([...stored, ...demoMarathons]);
    }

    let alive = true;
    (async () => {
      try {
        const remote = await api<Marathon[]>('/marathons');
        if (alive && Array.isArray(remote) && remote.length) {
          setMarathons((prev) => [
            ...prev.filter((item) => item.id.startsWith('local-')),
            ...remote.map((item, index) => ({
              ...demoMarathons[index % demoMarathons.length],
              ...item,
            })),
          ]);
        }
      } catch {
        /* демо-режим */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(() => {
    return marathons.filter((marathon) => {
      const byFilter =
        filter === 'Все' ||
        (filter === 'Мои' && (['m-1', 'm-2'].includes(marathon.id) || marathon.id.startsWith('local-'))) ||
        (filter === 'Pro' && marathon.tier === 'pro') ||
        (filter === 'Premium' && marathon.tier === 'premium');
      const byQuery =
        !query ||
        marathon.title.toLowerCase().includes(query.toLowerCase()) ||
        marathon.description.toLowerCase().includes(query.toLowerCase());
      return byFilter && byQuery;
    });
  }, [marathons, filter, query]);

  const activeCount = 2;

  return (
    <AppShell>
      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        <PageHeader
          eyebrow={<Badge variant="premium">Кураторы и сообщество</Badge>}
          title="Марафоны"
          subtitle="Групповые челленджи с заданиями, проверкой и живым общим чатом. Выберите свой темп и держитесь вместе."
          actions={
            <Button href="/marathons/create">
              <Plus className="h-4 w-4" /> Создать марафон
            </Button>
          }
        />

        {/* Мои активные */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {demoMarathons.slice(0, 2).map((marathon, index) => (
            <motion.div
              key={marathon.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.45 }}
            >
              <Link href={`/marathons/${marathon.id}`}>
                <Card hover glow className="group flex items-center gap-4 overflow-hidden p-4">
                  <MarathonCover
                    icon={marathon.icon}
                    cover={marathon.cover}
                    accent={marathon.accent}
                    size="sm"
                    className="w-28 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(168,255,53,0.8)]" />
                        В процессе
                      </span>
                      <span className="text-[9.5px] text-muted">День 7</span>
                    </div>
                    <h3 className="mt-1 truncate font-display text-[15px] font-bold text-white">{marathon.title}</h3>
                    <div className="mt-2.5 flex items-center gap-2">
                      <Progress value={index === 0 ? 58 : 34} className="h-1 flex-1" />
                      <span className="numeric text-[10px] text-white/50">{index === 0 ? 58 : 34}%</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" /> {index === 0 ? 7 : 4} из 12 заданий
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-2.5 w-2.5" /> {marathon.participants_count}
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-white/20 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Панель фильтров */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="hide-scrollbar flex items-center gap-1.5 overflow-x-auto">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-medium transition-all',
                  filter === item
                    ? 'border-white/[0.2] bg-white/[0.07] text-white'
                    : 'border-white/[0.08] bg-white/[0.02] text-muted hover:border-white/[0.16] hover:text-white',
                )}
              >
                {item}
                {item === 'Мои' ? <span className="ml-1.5 text-[9.5px] text-white/30">{activeCount}</span> : null}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Найти марафон…"
              className="input h-10 py-0 pl-9 text-[12px]"
            />
          </div>
        </div>

        {/* Каталог */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((marathon, index) => (
            <motion.div
              key={marathon.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
            >
              <Link href={`/marathons/${marathon.id}`} className="block h-full">
                <Card hover glow className="group flex h-full flex-col overflow-hidden p-3">
                  <MarathonCover
                    icon={marathon.icon}
                    cover={marathon.cover}
                    accent={marathon.accent}
                    image={marathon.cover_image}
                    className="rounded-xl"
                  >
                    <div className="absolute left-3 top-3 flex items-center gap-1.5">
                      <TierBadge tier={marathon.tier} />
                      <span className="rounded-full border border-white/[0.12] bg-black/40 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white/70 backdrop-blur">
                        {marathon.duration}
                      </span>
                    </div>
                    <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[10px] text-white/70">
                        <Calendar className="h-3 w-3" /> Старт {marathon.start_date}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-white/60">
                        <Users className="h-3 w-3" /> {marathon.participants_count.toLocaleString('ru-RU')}
                      </span>
                    </div>
                  </MarathonCover>

                  <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-[16px] font-bold leading-snug tracking-[-0.02em] text-white">
                        {marathon.title}
                      </h3>
                      <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-white/20 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                    </div>
                    <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-muted line-clamp-2">
                      {marathon.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                      <span className="text-[10.5px] text-white/40">{marathon.curator}</span>
                      <span className="flex items-center gap-1 text-[10.5px] text-muted">
                        <Flame className="h-3 w-3 text-[#FF5A36]/70" /> {marathon.tasks_count} заданий
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {!visible.length ? (
          <Card className="mt-4 p-12 text-center">
            <Trophy className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-3 font-display text-base font-bold text-white">Ничего не найдено</p>
            <p className="mt-1 text-[12px] text-muted">Попробуйте другой фильтр или запрос.</p>
          </Card>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11.5px] text-muted">
            Марафон длится 2–12 недель. Задания проверяет куратор, прогресс виден в таблице участников.
          </p>
          <Link href="/friends" className="text-[11.5px] font-medium text-white/70 transition-colors hover:text-white">
            Пригласить друга →
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
