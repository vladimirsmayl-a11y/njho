'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Flame, Snowflake, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn, plural } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type Variant = 'flame' | 'day' | 'freeze';

export function StreakWidget({
  streak,
  best,
  dayClosed,
  percent,
  tasksDone,
  tasksTotal,
  freezeCount,
  justClosed,
  freezeBusy = false,
  onFreeze,
}: {
  streak: number;
  best: number;
  dayClosed: boolean;
  percent: number;
  tasksDone: number;
  tasksTotal: number;
  freezeCount: number;
  justClosed: boolean;
  freezeBusy?: boolean;
  onFreeze: () => void;
}) {
  const { t } = useI18n();
  const variant: Variant = dayClosed ? 'day' : 'flame';
  const left = Math.max(0, tasksTotal - tasksDone);

  const shell =
    variant === 'day'
      ? 'border-white bg-white text-bg'
      : 'border-[#FF5A36]/25 bg-[#140d0c] text-white';

  return (
    <div
      className={cn(
        'widget-3d relative overflow-hidden rounded-[28px] border p-5 sm:p-6',
        shell,
        justClosed && 'day-pop',
      )}
    >
      {/* фон */}
      {variant === 'flame' ? (
        <>
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#FF5A36]/[0.18] blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_200px_at_10%_120%,rgba(255,90,54,0.12),transparent_70%)]" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/[0.18] blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_200px_at_10%_120%,rgba(168,255,53,0.14),transparent_70%)]" />
        </>
      )}

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
              variant === 'day'
                ? 'border-bg/15 bg-bg/[0.04] text-bg/60'
                : 'border-white/[0.1] bg-white/[0.04] text-white/55',
            )}
          >
            {variant === 'day' ? (
              <Sparkles className="h-3 w-3" />
            ) : (
              <Flame className="h-3 w-3 text-[#FF5A36]" fill="currentColor" />
            )}
            {t('dash.streak')}
          </div>

          <div className="mt-3 flex items-end gap-3">
            {variant === 'day' ? (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-[44px] font-extrabold leading-none tracking-[-0.04em] sm:text-[54px]"
              >
                День {streak}
              </motion.p>
            ) : (
              <p className="font-display text-[52px] font-extrabold leading-none tracking-[-0.04em] sm:text-[62px]">
                {streak}
              </p>
            )}
            {variant === 'flame' ? (
              <p className="mb-1.5 text-[12px] text-white/45">
                {plural(streak, 'день', 'дня', 'дней')} подряд
              </p>
            ) : null}
          </div>

          <p
            className={cn(
              'mt-2 max-w-md text-[12.5px] leading-relaxed',
              variant === 'day' ? 'text-bg/60' : 'text-white/55',
            )}
          >
            {variant === 'day'
              ? `Серия сохранена. Рекорд — ${best} ${plural(best, 'день', 'дня', 'дней')}.`
              : tasksTotal === 0
                ? 'Добавьте задачи на сегодня — и закройте день, чтобы огонёк горел.'
                : `Закройте все задачи: осталось ${left} ${plural(left, 'задача', 'задачи', 'задач')}.`}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {variant === 'day' ? (
              <Button href="/tracker" variant="ghost" className="border-bg/20 text-bg hover:border-bg/40 hover:bg-bg/[0.06]">
                {t('dash.allTrackers')} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button href="/dashboard#tasks" className="bg-[#FF5A36] text-white hover:bg-[#ff6b4a]">
                Продлите огонёк <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
            <button
              type="button"
              onClick={onFreeze}
              disabled={freezeBusy || freezeCount <= 0 || dayClosed}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-35',
                variant === 'day'
                  ? 'border-bg/15 text-bg/60 hover:border-bg/30 hover:text-bg'
                  : 'border-[#7FC8FF]/25 text-[#9fd8ff] hover:border-[#7FC8FF]/50',
              )}
            >
              <Snowflake className="h-3.5 w-3.5" /> Заморозка · {freezeCount}
            </button>
          </div>
        </div>

        {/* 3D-орб */}
        <div className="widget-3d-inner relative mx-auto h-[132px] w-[132px] shrink-0 sm:mx-0">
          <div className="absolute inset-0 rounded-full blur-2xl" style={{ background: variant === 'day' ? 'rgba(168,255,53,0.28)' : 'rgba(255,90,54,0.28)' }} />
          <motion.div
            animate={variant === 'day' ? { scale: [1, 1.06, 1] } : { y: [0, -4, 0] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
            className={cn(
              'absolute inset-2 rounded-full border',
              variant === 'day'
                ? 'border-bg/15 bg-[radial-gradient(circle_at_32%_26%,#ffffff,#dfffb9_38%,#a8ff35_70%,#4e7a12)]'
                : 'border-[#FF5A36]/30 bg-[radial-gradient(circle_at_32%_26%,#ffb199,#ff6b4a_38%,#b32d14_72%,#3d0d05)]',
            )}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {variant === 'day' ? (
                <Sparkles className="h-11 w-11 text-bg/70" strokeWidth={1.2} />
              ) : (
                <Flame className="h-12 w-12 animate-fire text-white/90" strokeWidth={1.2} fill="currentColor" />
              )}
            </div>
          </motion.div>
          <div className="widget-orbit absolute -inset-1 rounded-full border border-white/15" style={{ transform: 'rotateX(68deg)' }} />
          <div className="widget-orbit-slow absolute -inset-3 rounded-full border border-white/10" style={{ transform: 'rotateY(62deg)' }} />
          <div
            className={cn(
              'absolute -bottom-1 left-1/2 h-2 w-24 -translate-x-1/2 rounded-full blur-md',
              variant === 'day' ? 'bg-primary/40' : 'bg-[#FF5A36]/40',
            )}
          />
        </div>
      </div>

      {/* мини-состояния */}
      <div className="relative mt-5 grid gap-2 sm:grid-cols-3">
        <StatePill
          active={variant === 'flame'}
          title="Продлите огонёк"
          note={`${percent}% дня · ${tasksDone}/${tasksTotal}`}
          tone="flame"
        />
        <StatePill
          active={variant === 'day'}
          title={`День ${streak}`}
          note={dayClosed ? 'Серия сохранена' : 'Закройте все задачи'}
          tone="day"
        />
        <StatePill
          active={false}
          title="Заморозка"
          note={freezeCount > 0 ? `${freezeCount} в запасе` : 'Пока нет'}
          tone="freeze"
        />
      </div>
    </div>
  );
}

function StatePill({
  active,
  title,
  note,
  tone,
}: {
  active: boolean;
  title: string;
  note: string;
  tone: 'flame' | 'day' | 'freeze';
}) {
  const palette = {
    flame: active ? 'border-[#FF5A36]/45 bg-[#FF5A36]/[0.1] text-white' : 'border-white/[0.08] bg-white/[0.02] text-white/45',
    day: active ? 'border-bg/20 bg-bg/[0.05] text-bg' : 'border-white/[0.08] bg-white/[0.02] text-white/45',
    freeze: 'border-[#7FC8FF]/20 bg-[#7FC8FF]/[0.05] text-[#9fd8ff]/80',
  } as const;
  return (
    <div className={cn('flex items-center gap-2.5 rounded-xl border px-3 py-2.5', palette[tone])}>
      {tone === 'flame' ? (
        <Flame className="h-3.5 w-3.5 shrink-0" fill={active ? 'currentColor' : 'none'} />
      ) : tone === 'day' ? (
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Snowflake className="h-3.5 w-3.5 shrink-0 frost-shimmer" />
      )}
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium">{title}</p>
        <p className="truncate text-[9.5px] uppercase tracking-[0.1em] opacity-60">{note}</p>
      </div>
    </div>
  );
}
