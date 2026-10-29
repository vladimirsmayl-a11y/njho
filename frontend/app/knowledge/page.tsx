'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Brain,
  Clock,
  Compass,
  Moon,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AppShell, Badge, Button, Card, PageHeader } from '@/components/ui';
import { KnowledgeCover } from '@/components/knowledge-cover';
import {
  KNOWLEDGE_CATEGORIES,
  categoryCount,
  knowledgeArticles,
  knowledgeStats,
  practicalArticles,
  searchArticles,
  type KnowledgeCategoryId,
} from '@/lib/knowledge';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS = {
  habits: Sparkles,
  discipline: Shield,
  mind: Brain,
  progress: TrendingUp,
  goals: Target,
  focus: Compass,
  identity: UserRound,
  recovery: Moon,
  system: Settings2,
  mastery: Award,
} as const;

const PAGE = 12;

export default function KnowledgePage() {
  const [selected, setSelected] = useState<KnowledgeCategoryId | null>(null);
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE);

  const filtered = useMemo(() => searchArticles(query, selected), [query, selected]);

  const featuredHabits = useMemo(
    () => knowledgeArticles.filter((article) => article.category === 'habits' && !article.practical).slice(0, 6),
    [],
  );

  const activeCategory = KNOWLEDGE_CATEGORIES.find((category) => category.id === selected);
  const searching = query.trim().length > 0;
  const showFeatured = !selected && !searching;

  const pickCategory = (id: KnowledgeCategoryId | null) => {
    setSelected(id);
    setVisible(PAGE);
  };

  const list = filtered.slice(0, visible);

  return (
    <AppShell>
      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        <PageHeader
          eyebrow={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="pro">Библиотека знаний</Badge>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-muted">
                {knowledgeStats.total} материала · {knowledgeStats.practical} практик
              </span>
            </div>
          }
          title="База знаний"
          subtitle="Короткие материалы без воды: привычки, дисциплина, мышление, восстановление и система. Одна статья в день — уже прогресс."
        />

        {/* Поиск */}
        <Card className="relative mb-5 overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] text-white/70">
                <BookOpen className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="font-display text-[16px] font-bold tracking-[-0.02em] text-white">
                  Что хотите улучшить сегодня?
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Поиск по заголовкам и тексту всех статей
                </p>
              </div>
            </div>
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisible(PAGE);
                }}
                placeholder="Например: утренняя рутина или сон"
                aria-label="Поиск по базе знаний"
                className="input h-11 py-0 pl-11 pr-10 text-[12.5px]"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Очистить поиск"
                  className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </Card>

        {/* Категории */}
        <div className="-mx-5 mb-6 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            <button
              type="button"
              onClick={() => pickCategory(null)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11.5px] transition-all',
                selected === null
                  ? 'border-white bg-white text-bg'
                  : 'border-white/[0.1] bg-white/[0.02] text-white/60 hover:border-white/[0.22] hover:text-white',
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Все
              <span className={cn('numeric text-[10px]', selected === null ? 'text-bg/50' : 'text-white/30')}>
                {knowledgeStats.total}
              </span>
            </button>
            {KNOWLEDGE_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category.id];
              const active = selected === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => pickCategory(active ? null : category.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11.5px] transition-all',
                    active
                      ? 'border-white bg-white text-bg'
                      : 'border-white/[0.1] bg-white/[0.02] text-white/60 hover:border-white/[0.22] hover:text-white',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {category.title}
                  <span className={cn('numeric text-[10px]', active ? 'text-bg/50' : 'text-white/30')}>
                    {categoryCount(category.id)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Подборка «Привычки» с 3D-обложками */}
        {showFeatured ? (
          <section className="mb-8">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="label">Категория</p>
                <h2 className="mt-1 font-display text-xl font-bold tracking-[-0.02em] text-white">Привычки</h2>
                <p className="mt-1 text-[11.5px] text-muted">
                  Как действие становится автоматическим и выдерживает плохие дни.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => pickCategory('habits')}>
                Все {categoryCount('habits')} <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {featuredHabits.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.4 }}
                >
                  <Link href={`/knowledge/${article.id}`} className="block h-full">
                    <Card hover className="group flex h-full flex-col overflow-hidden p-3">
                      <KnowledgeCover article={article} className="h-40" />
                      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
                        <h3 className="font-display text-[14.5px] font-bold leading-snug tracking-[-0.02em] text-white">
                          {article.title}
                        </h3>
                        <p className="mt-1.5 flex-1 text-[11.5px] leading-relaxed text-muted line-clamp-2">
                          {article.excerpt}
                        </p>
                        <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                          <span className="flex items-center gap-1.5 text-[10px] text-muted">
                            <Clock className="h-3 w-3" /> {article.read_time}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-white/35 transition-colors group-hover:text-white">
                            Читать <ArrowUpRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Практические статьи */}
            <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="label">Практика</p>
                  <h3 className="mt-1 font-display text-[15px] font-bold text-white">Протоколы на сегодня</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => pickCategory('habits')}>
                  Все практики
                </Button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {practicalArticles.slice(0, 3).map((article) => (
                  <Link
                    key={article.id}
                    href={`/knowledge/${article.id}`}
                    className="group flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-white/[0.16] hover:bg-white/[0.04]"
                  >
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A8FF35]" />
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-[11.5px] font-medium text-white">{article.title}</p>
                      <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.12em] text-white/30">
                        {article.read_time}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* Список статей */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="label">{searching ? 'Поиск' : activeCategory ? 'Категория' : 'Все материалы'}</p>
              <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-bold tracking-[-0.02em] text-white">
                {searching ? `«${query.trim()}»` : activeCategory ? activeCategory.title : 'Все материалы'}
                <span className="numeric rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-muted">
                  {filtered.length}
                </span>
              </h2>
              {activeCategory && !searching ? (
                <p className="mt-1 text-[11.5px] text-muted">{activeCategory.description}</p>
              ) : null}
            </div>
            {selected || searching ? (
              <button
                type="button"
                onClick={() => {
                  pickCategory(null);
                  setQuery('');
                }}
                className="shrink-0 text-[11px] text-muted transition-colors hover:text-white"
              >
                Сбросить
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, 8) * 0.03, duration: 0.35 }}
              >
                <Link href={`/knowledge/${article.id}`} className="block h-full">
                  <Card hover className="group flex h-full flex-col overflow-hidden p-3">
                    <KnowledgeCover article={article} className="h-32" />
                    <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
                      <h3 className="font-display text-[14px] font-bold leading-snug tracking-[-0.02em] text-white">
                        {article.title}
                      </h3>
                      <p className="mt-1.5 flex-1 text-[11.5px] leading-relaxed text-muted line-clamp-2">
                        {article.excerpt}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                        <span className="flex items-center gap-1.5 text-[10px] text-muted">
                          <Clock className="h-3 w-3" /> {article.read_time}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-white/35 transition-colors group-hover:text-white">
                          Читать <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          {!filtered.length ? (
            <Card className="p-12 text-center">
              <Search className="mx-auto h-8 w-8 text-muted" />
              <p className="mt-3 font-display text-base font-bold text-white">Статьи не найдены</p>
              <p className="mt-1 text-[12px] text-muted">
                Попробуйте изменить запрос или выбрать другую категорию.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setQuery('');
                  pickCategory(null);
                }}
              >
                Показать все
              </Button>
            </Card>
          ) : null}

          {visible < filtered.length ? (
            <div className="mt-6 flex justify-center">
              <Button variant="ghost" onClick={() => setVisible((value) => value + PAGE)}>
                Показать ещё {Math.min(PAGE, filtered.length - visible)}
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
