'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Copy,
  Gift,
  Link2,
  QrCode,
  Share2,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AppShell, Badge, Button, Card, PageHeader, playSound, toast } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { copyText, inviteCode, inviteLink } from '@/lib/invite';

export default function InviteFriendPage() {
  const { user } = useAuth();
  const username = user?.username || 'alexey';
  const [copied, setCopied] = useState(false);
  const link = inviteLink(username);
  const code = inviteCode(username);

  const copy = async () => {
    const ok = await copyText(link);
    if (!ok) {
      toast('Не удалось скопировать', {
        description: 'Выделите ссылку и скопируйте вручную',
        tone: 'danger',
      });
      return;
    }
    setCopied(true);
    playSound('spark');
    toast('Скопировано', {
      description: 'Ссылка-приглашение в буфере обмена',
      tone: 'success',
    });
    window.setTimeout(() => setCopied(false), 2200);
  };

  const share = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'ЛВС — Лучшая Версия Себя',
          text: 'Присоединяйся к моему кругу роста в ЛВС',
          url: link,
        });
        playSound('levelup');
      } catch {
        /* пользователь отменил */
      }
    } else {
      void copy();
    }
  };

  return (
    <AppShell>
      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        <Link
          href="/friends"
          className="mb-5 inline-flex items-center gap-2 text-[11.5px] text-muted transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Назад к друзьям
        </Link>

        <PageHeader
          eyebrow={<Badge variant="pro">Круг поддержки</Badge>}
          title="Пригласить друга"
          subtitle="Один человек рядом повышает шансы не бросить в два раза. Отправьте ссылку — он попадёт в ваш круг."
        />

        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <div className="space-y-6">
            <Card className="relative overflow-hidden p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/[0.08] blur-3xl" />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/[0.08] text-primary">
                <Gift className="h-5 w-5" />
              </div>
              <h2 className="mt-5 font-display text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-[28px]">
                Подарите месяц Pro
              </h2>
              <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-muted">
                Друг получит 30 дней Pro после регистрации, а вы — 14 дней к подписке, когда он закроет первую неделю.
              </p>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-3">
                  <Link2 className="h-4 w-4 shrink-0 text-muted" />
                  <span className="truncate text-[12px] text-white/70">{link}</span>
                </div>
                <Button onClick={copy} className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Скопировано' : 'Копировать'}
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button variant="ghost" onClick={share}>
                  <Share2 className="h-4 w-4" /> Поделиться
                </Button>
                <span className="text-[10.5px] text-muted">Код приглашения: <span className="font-mono text-white/60">{code}</span></span>
              </div>

              <div className="mt-6 grid gap-2 border-t border-white/[0.06] pt-5 sm:grid-cols-3">
                {[
                  { step: '01', text: 'Отправьте ссылку другу' },
                  { step: '02', text: 'Он регистрируется и выбирает цель' },
                  { step: '03', text: 'Вы получаете бонус, он — месяц Pro' },
                ].map((item) => (
                  <div key={item.step} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <span className="numeric text-[10px] font-bold text-primary">{item.step}</span>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{item.text}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="label">Последние приглашения</p>
                  <h2 className="mt-1.5 font-display text-lg font-bold text-white">Кто уже в пути</h2>
                </div>
                <Badge variant="free">3 отправлено</Badge>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { name: 'Никита П.', status: 'Зарегистрировался', done: true },
                  { name: 'Ольга М.', status: 'Открыл ссылку', done: false },
                  { name: 'Сергей Л.', status: 'Приглашение отправлено', done: false },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-white/60">
                      {item.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-white">{item.name}</p>
                      <p className="text-[10px] text-muted">{item.status}</p>
                    </div>
                    {item.done ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* QR и советы */}
          <div className="space-y-6">
            <Card className="p-6 text-center">
              <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.03]">
                <div className="relative">
                  <QrCode className="h-20 w-20 text-white/70" strokeWidth={1} />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-bg">
                    <Sparkles className="h-3 w-3" />
                  </span>
                </div>
              </div>
              <p className="mt-4 font-display text-[15px] font-bold text-white">QR-код приглашения</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Покажите с экрана — друг отсканирует камерой и сразу попадёт на регистрацию.
              </p>
              <Button variant="ghost" className="mt-4 w-full" onClick={copy}>
                <Copy className="h-4 w-4" /> Скопировать ссылку
              </Button>
            </Card>

            <Card className="p-5 sm:p-6">
              <p className="label">Почему это работает</p>
              <div className="mt-4 space-y-3">
                {[
                  { icon: Users, title: 'Общая серия', text: 'Видно прогресс друг друга — сложнее пропустить день.' },
                  { icon: Sparkles, title: 'Совместные марафоны', text: 'Приглашайте в челленджи и проходите их вместе.' },
                  { icon: UserPlus, title: 'Общий прогресс', text: 'Серии и задания друзей видны в вашем круге — без лишнего шума.' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-primary/80">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-[11.5px] font-semibold text-white">{item.title}</p>
                        <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{item.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
