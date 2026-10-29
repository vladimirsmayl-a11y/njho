'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Crown, Lock, ShieldAlert, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { AppShell, Badge, Button, Card, playSound } from '@/components/ui';

const INCLUDED = [
  'Все трекеры и система квартала',
  'Марафоны с куратором и общий чат',
  'База знаний и расширенная аналитика',
  'Личный план и приоритетная поддержка',
];

export default function PaywallPage() {
  useEffect(() => {
    playSound('error');
  }, []);

  return (
    <AppShell>
      <div className="flex min-h-[calc(100vh-60px)] items-center justify-center px-5 py-12 lg:min-h-screen lg:px-10">
        <div className="pointer-events-none fixed inset-0 grid-lines opacity-50" aria-hidden />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-lg"
        >
          <Card className="relative overflow-hidden p-6 text-center sm:p-9">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-danger/[0.07] blur-3xl" />
            <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-danger/50 to-transparent" />

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-danger/25 bg-danger/[0.08] text-danger">
              <ShieldAlert className="h-8 w-8" strokeWidth={1.6} />
            </div>

            <Badge variant="danger" className="mt-5">
              <Lock className="h-2.5 w-2.5" /> Доступ ограничен
            </Badge>

            <h1 className="mt-4 font-display text-[30px] font-extrabold leading-[1.05] tracking-[-0.035em] text-white sm:text-[36px]">
              Доступ приостановлен
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-muted">
              Подписка истекла или доступ ограничен администратором. Прогресс, серии и записи
              сохранены — вернитесь, когда будете готовы.
            </p>

            <div className="mt-7 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-left">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-premium" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Что вернётся с подпиской
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {INCLUDED.map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    <span className="text-[11.5px] leading-relaxed text-white/65">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Button href="/pricing" className="w-full" onClick={() => playSound('levelup')}>
                <Sparkles className="h-4 w-4" /> Перейти к тарифам
              </Button>
              <Button variant="ghost" href="/dashboard" className="w-full">
                <ArrowLeft className="h-4 w-4" /> Вернуться на дашборд
              </Button>
            </div>

            <p className="mt-5 text-[10.5px] leading-relaxed text-muted">
              Уже оплатили, но доступ не вернулся? Напишите в поддержку через{' '}
              <Link href="/contacts" className="text-primary hover:underline">
                Telegram-бота
              </Link>{' '}
              — проверим вручную.
            </p>
          </Card>
        </motion.div>
      </div>
    </AppShell>
  );
}
