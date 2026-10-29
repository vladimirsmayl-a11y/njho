'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Crown,
  HelpCircle,
  Lock,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AppShell, Badge, Button, Card, PageHeader, TierBadge, playSound } from '@/components/ui';
import { tariffs } from '@/content/tariffs';
import { cn } from '@/lib/utils';

const FAQ = [
  {
    q: 'Можно ли отменить подписку?',
    a: 'Да, в любой момент в настройках профиля. Доступ сохранится до конца оплаченного периода.',
  },
  {
    q: 'Чем Premium отличается от Pro?',
    a: 'Premium открывает расширенные марафоны с куратором, индивидуальный план и приоритетную поддержку.',
  },
  {
    q: 'Что если доступ ограничен администратором?',
    a: 'Напишите в поддержку через Telegram-бота. Обычно вопрос решается в течение дня.',
  },
];

export default function PricingPage() {
  return (
    <AppShell>
      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        <Link
          href="/profile"
          className="mb-5 inline-flex items-center gap-2 text-[11.5px] text-muted transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Назад в профиль
        </Link>

        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="premium">
            <Crown className="h-2.5 w-2.5" /> Тарифы ЛВС
          </Badge>
          <h1 className="mt-4 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.035em] text-white sm:text-[44px]">
            Инвестиция в себя,
            <br />
            <span className="text-white/45">а не в подписку</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[13px] leading-relaxed text-muted sm:text-[14px]">
            Один месяц ЛВС дешевле двух чашек кофе в неделю. Отмена — в один клик, без звонков и писем.
          </p>
        </div>

        <div className="mx-auto mt-9 grid max-w-5xl gap-4 lg:grid-cols-3">
          {tariffs.map((tariff, index) => {
            const featured = tariff.featured;
            return (
              <motion.div
                key={tariff.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.45 }}
              >
                <Card
                  className={cn(
                    'relative flex h-full flex-col overflow-hidden p-6',
                    featured ? 'border-white/[0.14] bg-white/[0.035] shadow-[0_0_70px_-50px_rgba(255,255,255,0.55)]' : '',
                  )}
                >
                  {featured ? (
                    <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                  ) : null}
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.18em] text-white/85">
                      {tariff.name}
                    </h2>
                    {featured ? (
                      <Badge variant="pro">
                        <Sparkles className="h-2.5 w-2.5" /> Выбор большинства
                      </Badge>
                    ) : tariff.id === 'standard' ? (
                      <Badge variant="free">Стандарт</Badge>
                    ) : (
                      <TierBadge tier={tariff.id} />
                    )}
                  </div>

                  <p className="mt-4 text-[11.5px] text-muted">{tariff.description}</p>

                  <div className="mt-4 flex items-end gap-1.5">
                    <span className="numeric font-display text-[38px] font-extrabold leading-none tracking-[-0.03em] text-white">
                      {tariff.price} ₽
                    </span>
                    <span className="pb-1 text-[11px] text-muted">/ месяц</span>
                  </div>
                  {tariff.oldPrice ? (
                    <p className="mt-1 text-[10.5px] text-muted line-through">{tariff.oldPrice}</p>
                  ) : (
                    <p className="mt-1 text-[10.5px] text-transparent">—</p>
                  )}

                  <div className="mt-5 space-y-2.5 border-t border-white/[0.06] pt-5">
                    {tariff.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                            featured ? 'bg-white/[0.1] text-white/70' : 'bg-white/[0.06] text-white/60',
                          )}
                        >
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                        <span className="text-[11.5px] leading-relaxed text-white/70">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-6">
                    <Button
                      className="w-full"
                      variant={featured ? 'primary' : 'ghost'}
                      href={tariff.href === '#' ? '/contacts' : tariff.href}
                      onClick={() => playSound(featured ? 'levelup' : 'click')}
                    >
                      {featured ? 'Оформить Pro' : tariff.id === 'premium' ? 'Оформить Premium' : 'Начать со Стандарта'}
                    </Button>
                    <p className="mt-2 text-center text-[9.5px] text-muted">Оплата картой или через Telegram</p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="mx-auto mt-6 flex max-w-5xl flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-primary">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[12px] font-medium text-white">Безопасная оплата и возврат 7 дней</p>
              <p className="text-[10.5px] text-muted">Если не зайдёт — вернём деньги без вопросов.</p>
            </div>
          </div>
          <Link href="/contacts" className="text-[11.5px] text-primary hover:underline">
            Задать вопрос →
          </Link>
        </div>

        <div className="mx-auto mt-10 max-w-3xl">
          <div className="mb-4 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted" />
            <h2 className="font-display text-lg font-bold text-white">Частые вопросы</h2>
          </div>
          <div className="space-y-2">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between text-[12.5px] font-medium text-white/85">
                  {item.q}
                  <span className="text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-2xl border border-danger/15 bg-danger/[0.03] p-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-danger/70" />
          <p className="text-[11px] leading-relaxed text-muted">
            Если доступ уже ограничен, оплата восстановит его автоматически. Если этого не произошло —
            напишите в поддержку, мы проверим вручную.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
