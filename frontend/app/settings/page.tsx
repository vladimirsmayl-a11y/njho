'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Download,
  Flame,
  Mail,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import {
  AppShell,
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  PWAInstallCard,
  Toggle,
  playSound,
  toast,
} from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { api, body, errorText } from '@/lib/api';
import { usePersistentState } from '@/lib/use-persistent-state';
import { LANG_LABELS, useI18n, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, refresh, demo } = useAuth();
  const { lang, setLang, t } = useI18n();
  const [emailDigest, setEmailDigest] = usePersistentState<boolean>('lvs:email-digest', false);
  const [weekly, setWeekly] = usePersistentState<boolean>('lvs:weekly-report', true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [email, setEmail] = useState(user?.email ?? '');
  const [savingEmail, setSavingEmail] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    setEmail(user?.email ?? '');
  }, [user?.email]);

  const saveEmail = async () => {
    const clean = email.trim();
    if (!clean || clean === user?.email) return;
    setSavingEmail(true);
    try {
      if (demo) {
        toast('Почта сохранена', { description: 'Демо-режим: изменение только на устройстве', tone: 'success' });
      } else {
        await api('/me', { method: 'PATCH', body: body({ email: clean }) });
        await refresh();
        toast('Почта обновлена', { description: clean, tone: 'success' });
      }
      playSound('spark');
    } catch (error) {
      toast('Не удалось сохранить почту', { description: errorText(error), tone: 'danger' });
    } finally {
      setSavingEmail(false);
    }
  };

  const downloadData = () => {
    const snapshot: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      user: {
        username: user?.username ?? null,
        email: user?.email ?? null,
        tier: user?.tier ?? null,
        streak: user?.streak ?? 0,
      },
    };
    try {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (!key || !key.startsWith('lvs:')) continue;
        const raw = window.localStorage.getItem(key);
        if (raw === null) continue;
        try {
          snapshot[key] = JSON.parse(raw);
        } catch {
          snapshot[key] = raw;
        }
      }
    } catch {
      /* приватный режим */
    }
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lvs-${user?.username ?? 'data'}.json`;
    link.click();
    URL.revokeObjectURL(url);
    playSound('spark');
    toast('Данные скачаны', { description: 'JSON с прогрессом и настройками', tone: 'success' });
  };

  const deleteAccount = async () => {
    if (confirmText.trim().toUpperCase() !== 'УДАЛИТЬ') return;
    setDeleting(true);
    try {
      if (!demo) {
        await api('/me', { method: 'DELETE' });
      }
      try {
        window.localStorage.clear();
      } catch {
        /* приватный режим */
      }
      playSound('error');
      window.location.href = '/login';
    } catch (error) {
      toast('Не удалось удалить аккаунт', { description: errorText(error), tone: 'danger' });
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        <Link
          href="/profile"
          className="mb-5 inline-flex items-center gap-2 text-[11.5px] text-muted transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Назад в профиль
        </Link>

        <PageHeader
          eyebrow={<Badge variant="pro">{t('settings.title')}</Badge>}
          title={t('settings.title')}
          subtitle={t('settings.subtitle')}
          actions={
            <div className="flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.03] p-1">
              {(['ru', 'kz', 'en'] as Lang[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setLang(option);
                    playSound('click');
                  }}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors',
                    option === lang ? 'bg-white text-bg' : 'text-white/50 hover:text-white',
                  )}
                  aria-pressed={option === lang}
                >
                  {LANG_LABELS[option]}
                </button>
              ))}
            </div>
          }
        />

        <div className="mx-auto max-w-4xl space-y-5">
          {/* Почта */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/70">
                <Mail className="h-4 w-4" />
              </span>
              <div>
                <p className="label">{t('settings.email')}</p>
                <h2 className="font-display text-[15px] font-bold text-white">Адрес и письма</h2>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                aria-label="Почта"
                className="flex-1"
              />
              <Button
                onClick={saveEmail}
                disabled={savingEmail || !email.trim() || email.trim() === user?.email}
                className="shrink-0"
              >
                {savingEmail ? 'Сохраняем…' : t('common.save')}
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              <Row
                icon={Mail}
                title={t('settings.digest')}
                description="Письмо раз в неделю: серия, прогресс и точки роста"
                control={<Toggle checked={emailDigest} onChange={setEmailDigest} label="Дайджест" />}
              />
              <Row
                icon={Sparkles}
                title={t('settings.weekly')}
                description="Короткий отчёт по воскресеньям — без лишних писем"
                control={<Toggle checked={weekly} onChange={setWeekly} label="Отчёт" />}
              />
            </div>
          </Card>

          {/* Данные */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/70">
                <Download className="h-4 w-4" />
              </span>
              <div>
                <p className="label">{t('settings.data')}</p>
                <h2 className="font-display text-[15px] font-bold text-white">Экспорт и удаление</h2>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={downloadData}
                className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 text-left transition-colors hover:bg-white/[0.04]"
              >
                <div>
                  <p className="text-[12px] font-medium text-white">Скачать мои данные</p>
                  <p className="text-[10px] text-muted">JSON · записи, прогресс, настройки</p>
                </div>
                <Download className="h-4 w-4 text-muted" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(true);
                  setConfirmText('');
                  playSound('error');
                }}
                className="flex items-center justify-between rounded-xl border border-danger/20 bg-danger/[0.03] px-3.5 py-3 text-left transition-colors hover:bg-danger/[0.07]"
              >
                <div>
                  <p className="text-[12px] font-medium text-danger">{t('settings.delete')}</p>
                  <p className="text-[10px] text-danger/60">{t('settings.deleteText')}</p>
                </div>
                <Trash2 className="h-4 w-4 text-danger/70" />
              </button>
            </div>
          </Card>

          {/* Быстрый старт */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/70">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="label">{t('settings.quickStart')}</p>
                <h2 className="font-display text-[15px] font-bold text-white">Четыре шага</h2>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              Короткая памятка на первый месяц. Вернитесь сюда, если собьётесь с ритма.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                {
                  href: '/tracker/12-weeks',
                  title: 'Поставьте цель на квартал',
                  description: '12 недель и 3 тактики в день',
                  icon: Target,
                },
                {
                  href: '/dashboard',
                  title: 'Соберите задачи дня',
                  description: '5–7 дел, не больше',
                  icon: Check,
                },
                {
                  href: '/journal',
                  title: 'Запишите первый день',
                  description: '5 минут честной рефлексии',
                  icon: BookOpen,
                },
                {
                  href: '/tracker/tempo',
                  title: 'Оцените темп вечером',
                  description: 'Шкала 1–12 и динамика месяца',
                  icon: Flame,
                },
              ].map((step, index) => {
                const Icon = step.icon;
                return (
                  <Link
                    key={step.title}
                    href={step.href}
                    onClick={() => playSound('click')}
                    className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 transition-colors hover:border-white/[0.14] hover:bg-white/[0.04]"
                  >
                    <span className="numeric mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.1] text-[10px] text-white/40">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-[12px] font-medium text-white">
                        <Icon className="h-3.5 w-3.5 text-white/40" /> {step.title}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{step.description}</p>
                    </div>
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/15 transition-all group-hover:translate-x-0.5 group-hover:text-white/50" />
                  </Link>
                );
              })}
            </div>
          </Card>

          <PWAInstallCard />
        </div>
      </div>

      {/* Удаление аккаунта: своя тёмная модалка без белой вспышки */}
      <AnimatePresence>
        {deleteOpen ? (
          <motion.div
            key="delete-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 p-3 sm:items-center sm:p-6"
            onClick={() => (deleting ? null : setDeleteOpen(false))}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.985 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-white/[0.1] bg-[#101012] shadow-panel"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-title"
            >
              <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
                <div>
                  <h3 id="delete-title" className="font-display text-lg font-bold tracking-[-0.02em] text-white">
                    {t('settings.delete')}?
                  </h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">{t('settings.deleteText')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                  aria-label={t('common.close')}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-muted transition-colors hover:border-white/20 hover:text-white disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-6 pb-6">
                <div className="rounded-xl border border-danger/20 bg-danger/[0.05] p-4">
                  <p className="text-[11.5px] leading-relaxed text-danger/80">
                    Скачайте архив с записями дневника и прогрессом трекеров заранее — после удаления
                    восстановить данные не получится.
                  </p>
                </div>
                <label htmlFor="delete-confirm" className="mt-4 block text-[11px] text-white/50">
                  Введите <span className="font-semibold text-white">УДАЛИТЬ</span>, чтобы подтвердить
                </label>
                <Input
                  id="delete-confirm"
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  placeholder="УДАЛИТЬ"
                  autoComplete="off"
                  className="mt-2"
                  disabled={deleting}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-white/[0.07] px-6 py-4">
                <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                  Оставить
                </Button>
                <Button
                  variant="danger"
                  onClick={deleteAccount}
                  disabled={deleting || confirmText.trim().toUpperCase() !== 'УДАЛИТЬ'}
                >
                  <Trash2 className="h-4 w-4" /> {deleting ? 'Удаляем…' : t('settings.deleteConfirm')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AppShell>
  );
}

function Row({
  icon: Icon,
  title,
  description,
  control,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-muted" />
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-white">{title}</p>
          <p className="text-[10px] leading-relaxed text-muted">{description}</p>
        </div>
      </div>
      {control}
    </div>
  );
}
