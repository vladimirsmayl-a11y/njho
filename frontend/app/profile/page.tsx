'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Crown,
  Flame,
  LogOut,
  Mail,
  Pencil,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AppShell,
  Avatar,
  Badge,
  Button,
  Card,
  PageHeader,
  Progress,
  PWAInstallCard,
  TierBadge,
  Toggle,
  playSound,
} from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { demoUser } from '@/lib/demo';
import { usePersistentState } from '@/lib/use-persistent-state';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = usePersistentState<string | null>('lvs:avatar', null);
  const [name, setName] = usePersistentState<string>('lvs:name', user?.username || demoUser.username);
  const [editing, setEditing] = usePersistentState<boolean>('lvs:profile-editing', false);
  const [notifications, setNotifications] = usePersistentState<boolean>('lvs:notifications', true);
  const [weekly, setWeekly] = usePersistentState<boolean>('lvs:weekly-report', true);

  const current = user || demoUser;
  const tier = current.tier || 'premium';

  const upload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      playSound('error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(String(reader.result));
      playSound('spark');
    };
    reader.readAsDataURL(file);
  };

  return (
    <AppShell>
      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-[11.5px] text-muted transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Назад в кабинет
        </Link>

        <PageHeader
          eyebrow={<Badge variant="pro">Личный кабинет</Badge>}
          title="Профиль"
          subtitle="Ваши данные, подписка и установка приложения. Здесь же — быстрые настройки."
          actions={
            <>
              <Button variant="ghost" href="/settings" asChild>
                <span>
                  <Pencil className="h-4 w-4" /> Настройки
                </span>
              </Button>
              <Button href="/pricing" asChild>
                <span>
                  <Crown className="h-4 w-4" /> Тарифы
                </span>
              </Button>
            </>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <div className="space-y-6">
            {/* Карточка пользователя */}
            <Card className="relative overflow-hidden p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/[0.06] blur-3xl" />
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="group relative mx-auto shrink-0 sm:mx-0">
                  <Avatar src={avatar} size={92} fallback={name} ring />
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#141416] bg-primary text-bg transition-transform hover:scale-110"
                    aria-label="Загрузить аватар"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={upload}
                  />
                </div>

                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <h2 className="font-display text-[24px] font-extrabold tracking-[-0.03em] text-white">
                      {name}
                    </h2>
                    <TierBadge tier={tier} />
                    <BadgeCheck className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-1 text-[12px] text-muted">{current.email || 'alexey@lvs.app'}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-muted">
                      <Calendar className="h-3 w-3" /> с марта 2025
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-muted">
                      <Flame className="h-3 w-3 text-primary" /> {current.streak ?? 34} дней подряд
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mx-auto shrink-0 sm:mx-0"
                  onClick={() => {
                    if (editing) playSound('levelup');
                    setEditing(!editing);
                  }}
                >
                  {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                  {editing ? 'Готово' : 'Изменить'}
                </Button>
              </div>

              {editing ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-5 border-t border-white/[0.06] pt-5"
                >
                  <label className="label mb-2 block">Никнейм</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input max-w-sm"
                    placeholder="Ваш ник"
                  />
                </motion.div>
              ) : null}

              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-5 sm:grid-cols-4">
                {[
                  { label: 'Серия', value: current.streak ?? 34, icon: Flame, accent: 'text-primary' },
                  { label: 'Заданий', value: current.total_tasks ?? 428, icon: Check, accent: 'text-[#7FC8FF]' },
                  { label: 'Звание', value: 'Мастер', icon: Trophy, accent: 'text-premium' },
                  { label: 'Друзей', value: 6, icon: Users, accent: 'text-[#B388FF]' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center sm:text-left">
                      <div className="flex items-center justify-center gap-1.5 text-[9.5px] uppercase tracking-[0.14em] text-muted sm:justify-start">
                        <Icon className={cn('h-3 w-3', item.accent)} /> {item.label}
                      </div>
                      <p className="numeric mt-1.5 font-display text-[18px] font-extrabold leading-none text-white">
                        {item.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Подписка */}
            <Card className="relative overflow-hidden p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-premium/[0.07] blur-3xl" />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-premium/25 bg-premium/[0.08] text-premium">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="label">Подписка</p>
                    <p className="mt-0.5 font-display text-[16px] font-bold text-white">
                      Premium · активна
                    </p>
                  </div>
                </div>
                <Badge variant="premium">
                  <Sparkles className="h-2.5 w-2.5" /> до 12 ноября
                </Badge>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-[10.5px]">
                  <span className="text-muted">Осталось 18 дней</span>
                  <span className="numeric text-white/60">60%</span>
                </div>
                <Progress value={60} className="h-1.5" />
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {['Все марафоны', 'Расширенная аналитика', 'Приоритетная поддержка', 'Личный план'].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-[11px] text-white/60">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    {feature}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                <Button href="/pricing" asChild>
                  <span>Продлить подписку</span>
                </Button>
                <Button variant="ghost" href="/paywall" asChild>
                  <span>Проверить доступ</span>
                </Button>
              </div>
            </Card>

            {/* Настройки */}
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="label">Быстрые настройки</p>
                  <h2 className="mt-1.5 font-display text-lg font-bold text-white">Уведомления</h2>
                </div>
                <Button variant="ghost" size="sm" href="/settings" asChild>
                  <span>
                    Все <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </Button>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-muted" />
                    <div>
                      <p className="text-[12px] font-medium text-white">Push-уведомления</p>
                      <p className="text-[10px] text-muted">Напоминания о задачах и марафонах</p>
                    </div>
                  </div>
                  <Toggle checked={notifications} onChange={setNotifications} label="Push-уведомления" />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted" />
                    <div>
                      <p className="text-[12px] font-medium text-white">Недельный отчёт</p>
                      <p className="text-[10px] text-muted">Score, серия и итоги каждое воскресенье</p>
                    </div>
                  </div>
                  <Toggle checked={weekly} onChange={setWeekly} label="Недельный отчёт" />
                </div>
              </div>
            </Card>
          </div>

          {/* Правая колонка */}
          <div className="space-y-6">
            <PWAInstallCard />

            <Card className="p-5 sm:p-6">
              <p className="label">Аккаунт</p>
              <div className="mt-4 space-y-1">
                {[
                  { href: '/settings', label: 'Настройки и приватность', icon: Shield },
                  { href: '/pricing', label: 'Тарифы и оплата', icon: Crown },
                  { href: '/friends/invite', label: 'Пригласить друга', icon: Users },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
                    >
                      <Icon className="h-3.5 w-3.5 text-muted" />
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-white/20" />
                    </Link>
                  );
                })}
              </div>
              <div className="mt-4 border-t border-white/[0.06] pt-3">
                <button
                  type="button"
                  onClick={() => {
                    void logout();
                    playSound('error');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] text-danger/80 transition-colors hover:bg-danger/[0.06] hover:text-danger"
                >
                  <LogOut className="h-3.5 w-3.5" /> Выйти из аккаунта
                </button>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary/70" />
                <p className="label">Безопасность</p>
              </div>
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
                Вход защищён одноразовым кодом из Telegram. Пароль нужен только для входа по нику.
                Мы не храним платёжные данные на своих серверах.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
