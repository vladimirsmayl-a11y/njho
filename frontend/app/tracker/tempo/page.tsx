'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Flame,
  Gauge,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AppShell,
  Badge,
  Button,
  Card,
  PageHeader,
  playSound,
  toast,
} from '@/components/ui';
import {
  averageScore,
  lastDays,
  loadTempo,
  longDate,
  saveTempoScore,
  shortDate,
  tempoMeta,
  tempoZone,
  todayISO,
  type TempoMap,
} from '@/lib/tempo';
import { cn, plural } from '@/lib/utils';

const SCORES = Array.from({ length: 12 }, (_, index) => index + 1);

function scoreButtonClass(score: number, selected: boolean) {
  const zone = tempoZone(score);
  if (selected) {
    if (zone === 'productive') return 'border-primary bg-primary text-bg shadow-[0_0_28px_-8px_rgba(168,255,53,0.7)]';
    if (zone === 'lazy') return 'border-[#FF6B4A] bg-[#FF6B4A] text-bg shadow-[0_0_28px_-8px_rgba(255,107,74,0.7)]';
    return 'border-white bg-white text-bg';
  }
  if (zone === 'productive') return 'border-primary/25 bg-primary/[0.04] text-primary/90 hover:border-primary/50 hover:bg-primary/[0.08]';
  if (zone === 'lazy') return 'border-[#FF6B4A]/25 bg-[#FF6B4A]/[0.04] text-[#FF8A6E] hover:border-[#FF6B4A]/50 hover:bg-[#FF6B4A]/[0.08]';
  return 'border-white/[0.12] bg-white/[0.03] text-white/70 hover:border-white/[0.26] hover:text-white';
}

export default function TempoPage() {
  const [tempo, setTempo] = useState<TempoMap>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const today = todayISO();

  useEffect(() => {
    const map = loadTempo();
    setTempo(map);
    setSelected(map[today] ?? null);
  }, [today]);

  const days = useMemo(() => lastDays(30), []);
  const average = useMemo(() => averageScore(tempo, 30), [tempo]);
  const todayScore = tempo[today];
  const productive = days.filter((day) => tempo[day] && tempo[day] <= 4).length;
  const lazy = days.filter((day) => tempo[day] && tempo[day] >= 9).length;
  const even = days.filter((day) => tempo[day] && tempo[day] > 4 && tempo[day] < 9).length;

  const streak = useMemo(() => {
    let count = 0;
    for (let index = days.length - 1; index >= 0; index -= 1) {
      const score = tempo[days[index]];
      if (typeof score !== 'number' || score > 4) break;
      count += 1;
    }
    return count;
  }, [days, tempo]);

  const history = useMemo(
    () =>
      days
        .filter((day) => typeof tempo[day] === 'number')
        .slice()
        .reverse()
        .slice(0, 10),
    [days, tempo],
  );

  const save = () => {
    if (!selected) return;
    saveTempoScore(today, selected);
    setTempo((prev) => ({ ...prev, [today]: selected }));
    setSaved(true);
    playSound('levelup');
    toast('Оценка сохранена', {
      description: `${longDate(today)} · ${selected}/12`,
      tone: 'success',
    });
    window.setTimeout(() => setSaved(false), 2400);
  };

  const selectedMeta = selected ? tempoMeta[tempoZone(selected)] : null;
  const todayMeta = todayScore ? tempoMeta[tempoZone(todayScore)] : null;

  return (
    <AppShell>
      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-9">
        <PageHeader
          eyebrow={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="free">Трекер</Badge>
              <span className="text-[10.5px] first-letter:uppercase text-muted">{longDate(today)}</span>
            </div>
          }
          title="Темп дня"
          subtitle="Одна честная оценка в день. Не про идеальность — про динамику за месяц."
          actions={
            <Button variant="ghost" href="/tracker">
              <ArrowLeft className="h-4 w-4" /> Все трекеры
            </Button>
          }
        />

        <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          {/* Оценка */}
          <Card className="relative overflow-hidden p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/[0.04] blur-3xl" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label">Оценка дня</p>
                <h2 className="mt-1.5 font-display text-xl font-bold tracking-[-0.02em] text-white">
                  Насколько продуктивным был день?
                </h2>
              </div>
              <Gauge className="h-5 w-5 shrink-0 text-white/20" strokeWidth={1.6} />
            </div>

            <div className="mt-5 grid grid-cols-6 gap-2 sm:grid-cols-12">
              {SCORES.map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => {
                    setSelected(score);
                    playSound('click');
                  }}
                  aria-pressed={selected === score}
                  aria-label={`${score} из 12`}
                  className={cn(
                    'flex h-12 items-center justify-center rounded-xl border font-display text-[15px] font-bold transition-all duration-200 active:scale-95',
                    scoreButtonClass(score, selected === score),
                  )}
                >
                  {score}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-[9.5px] uppercase tracking-[0.14em] text-white/25">
              <span>1 · продуктивно</span>
              <span>12 · лень</span>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {(
                [
                  { zone: 'productive' as const, range: '1–4', text: 'День двигал вперёд' },
                  { zone: 'even' as const, range: '5–8', text: 'Ровный темп без рывков' },
                  { zone: 'lazy' as const, range: '9–12', text: 'Восстановление и пауза' },
                ]
              ).map((item) => {
                const meta = tempoMeta[item.zone];
                const active = selected ? tempoZone(selected) === item.zone : false;
                return (
                  <div
                    key={item.zone}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 transition-all duration-300',
                      active ? cn(meta.border, meta.bg) : 'border-white/[0.06] bg-white/[0.02]',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn('numeric text-[11px] font-semibold', meta.text)}>
                        {item.range}
                      </span>
                      <span className={cn('h-1.5 w-1.5 rounded-full', meta.bar)} />
                    </div>
                    <p className="mt-1 text-[10.5px] leading-snug text-muted">{item.text}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11.5px] text-muted">
                {selectedMeta
                  ? `Выбрано: ${selected}/12 · ${selectedMeta.label}`
                  : 'Выберите оценку — от 1 до 12'}
              </p>
              <Button onClick={save} disabled={!selected}>
                {saved ? <Check className="h-4 w-4" /> : <Gauge className="h-4 w-4" />}
                {saved ? 'Сохранено' : todayScore ? 'Обновить оценку' : 'Сохранить оценку'}
              </Button>
            </div>
          </Card>

          {/* Сводка */}
          <Card className="flex flex-col p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label">Сегодня</p>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="numeric font-display text-[42px] font-extrabold leading-none text-white">
                    {todayScore ?? '—'}
                  </span>
                  <span className="text-[12px] text-muted">/ 12</span>
                </div>
                <p className={cn('mt-1.5 text-[11.5px]', todayMeta ? todayMeta.text : 'text-muted')}>
                  {todayMeta ? todayMeta.label : 'Оценка пока не поставлена'}
                </p>
              </div>
              <span
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-2xl border',
                  todayMeta ? cn(todayMeta.border, todayMeta.bg, todayMeta.text) : 'border-white/[0.1] bg-white/[0.03] text-white/30',
                )}
              >
                {todayScore ? (
                  todayScore <= 4 ? (
                    <TrendingUp className="h-5 w-5" strokeWidth={1.6} />
                  ) : todayScore >= 9 ? (
                    <TrendingDown className="h-5 w-5" strokeWidth={1.6} />
                  ) : (
                    <Minus className="h-5 w-5" strokeWidth={1.6} />
                  )
                ) : (
                  <Gauge className="h-5 w-5" strokeWidth={1.6} />
                )}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <p className="label">Среднее</p>
                <p className="numeric mt-1 text-[16px] font-bold text-white">
                  {average ? average.toFixed(1) : '—'}
                </p>
                <p className="mt-0.5 text-[9.5px] text-muted">за 30 дней</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <p className="label">Продуктивных</p>
                <p className="numeric mt-1 text-[16px] font-bold text-white">{productive}</p>
                <p className="mt-0.5 text-[9.5px] text-muted">
                  {plural(productive, 'день', 'дня', 'дней')} из 30
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {[
                { label: 'Продуктивно', value: productive, bar: 'bg-primary' },
                { label: 'Ровно', value: even, bar: 'bg-white/45' },
                { label: 'Лень', value: lazy, bar: 'bg-[#FF6B4A]' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="flex items-center gap-2 text-muted">
                      <span className={cn('h-1.5 w-1.5 rounded-full', row.bar)} /> {row.label}
                    </span>
                    <span className="numeric text-white/60">{row.value}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={cn('h-full rounded-full transition-all duration-700', row.bar)}
                      style={{ width: `${Math.round((row.value / 30) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto flex items-center gap-2.5 border-t border-white/[0.06] pt-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#FF5A36]/25 bg-[#FF5A36]/[0.08] text-[#FF5A36]">
                <Flame className="h-3.5 w-3.5" fill="currentColor" strokeWidth={1.4} />
              </span>
              <div>
                <p className="text-[11px] font-semibold text-white">
                  {streak} {plural(streak, 'день', 'дня', 'дней')} в продуктивном темпе
                </p>
                <p className="text-[10px] text-muted">серия подряд, заканчивая сегодня</p>
              </div>
            </div>
          </Card>
        </div>

        {/* График 30 дней */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.45 }}
          className="mt-5"
        >
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="label">Динамика</p>
                <h2 className="mt-1.5 font-display text-xl font-bold tracking-[-0.02em] text-white">
                  Последние 30 дней
                </h2>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-3 rounded-full bg-primary" /> 1–4
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-3 rounded-full bg-white/45" /> 5–8
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-3 rounded-full bg-[#FF6B4A]" /> 9–12
                </span>
              </div>
            </div>

            <div className="mt-6">
              <div className="relative flex h-40 items-end gap-[3px] sm:gap-1.5">
                <div
                  className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/[0.12]"
                  style={{ bottom: `${Math.max(8, ((13 - average) / 12) * 100)}%` }}
                >
                  <span className="absolute -top-4 right-0 text-[9px] uppercase tracking-[0.12em] text-white/30">
                    среднее {average ? average.toFixed(1) : '—'}
                  </span>
                </div>
                {days.map((day) => {
                  const score = tempo[day];
                  const meta = score ? tempoMeta[tempoZone(score)] : null;
                  const height = score ? Math.max(10, ((13 - score) / 12) * 100) : 5;
                  return (
                    <div
                      key={day}
                      className="group relative flex h-full flex-1 items-end"
                      title={score ? `${shortDate(day)} — ${score}/12` : `${shortDate(day)} — без оценки`}
                    >
                      <div
                        className={cn(
                          'w-full rounded-[3px] transition-all duration-500',
                          meta ? meta.bar : 'bg-white/[0.05]',
                          score && score >= 9 ? 'opacity-90' : undefined,
                        )}
                        style={{ height: `${height}%` }}
                      />
                      <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-white/[0.1] bg-[#151517] px-1.5 py-0.5 text-[9px] text-white/70 group-hover:block">
                        {score ? `${score}/12` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[9px] uppercase tracking-[0.1em] text-white/20">
                <span>{shortDate(days[0])}</span>
                <span>{shortDate(days[Math.floor(days.length / 2)])}</span>
                <span>сегодня</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* История */}
        <Card className="mt-5 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="label">История</p>
              <h2 className="mt-1.5 font-display text-lg font-bold text-white">Последние оценки</h2>
            </div>
            <span className="text-[10.5px] text-muted">{history.length} записей</span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {history.map((day) => {
              const score = tempo[day];
              const meta = tempoMeta[tempoZone(score)];
              return (
                <div
                  key={day}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5"
                >
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', meta.border, meta.bg)}>
                    <span className={cn('numeric text-[11px] font-bold', meta.text)}>{score}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] text-white/80 first-letter:uppercase">
                      {longDate(day)}
                    </p>
                    <p className="text-[9.5px] text-muted">{meta.label}</p>
                  </div>
                  <span className={cn('h-1.5 w-1.5 rounded-full', meta.bar)} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
