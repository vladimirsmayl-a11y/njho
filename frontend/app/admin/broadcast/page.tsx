'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  Check,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AppShell,
  Badge,
  Button,
  Card,
  PageHeader,
  Spinner,
  Textarea,
  Toggle,
  playSound,
  toast,
} from '@/components/ui';
import { AdminGuard } from '@/components/admin-guard';
import { api, body, errorText } from '@/lib/api';
import { cn } from '@/lib/utils';

type PostRow = {
  id: number;
  title: string;
  body: string;
  created_at: string;
  sent_to_telegram: boolean;
  sent_count: number;
};

type Stats = {
  users: number;
  active_by_tier?: Record<string, number>;
  dau?: number;
  wau?: number;
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BroadcastPage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [toTelegram, setToTelegram] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [postRows, statsData] = await Promise.all([
        api<PostRow[]>('/admin/posts'),
        api<Stats>('/admin/stats'),
      ]);
      setPosts(Array.isArray(postRows) ? postRows : []);
      setStats(statsData);
    } catch (error) {
      toast('Не удалось загрузить рассылки', { description: errorText(error), tone: 'danger' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const recipients = stats?.users ?? 0;
  const proCount = (stats?.active_by_tier?.pro ?? 0) + (stats?.active_by_tier?.premium ?? 0);

  const totalSent = useMemo(
    () => posts.reduce((sum, post) => sum + (post.sent_count || 0), 0),
    [posts],
  );

  const send = async () => {
    if (!title.trim() || !text.trim() || sending) return;
    setSending(true);
    try {
      const result = await api<{ id: number; sent_count: number }>('/admin/posts', {
        method: 'POST',
        body: body({
          title: title.trim(),
          body: text.trim(),
          send_to_telegram: toTelegram,
        }),
      });
      setTitle('');
      setText('');
      await load();
      playSound('levelup');
      toast('Рассылка отправлена', {
        description: `Уведомление получат ${result?.sent_count ?? recipients} человек`,
        tone: 'success',
      });
    } catch (error) {
      toast('Не удалось отправить рассылку', { description: errorText(error), tone: 'danger' });
    } finally {
      setSending(false);
    }
  };

  const remove = async (post: PostRow) => {
    if (!window.confirm(`Удалить запись «${post.title}» из истории?`)) return;
    setDeleting(post.id);
    try {
      await api(`/admin/posts/${post.id}`, { method: 'DELETE' });
      setPosts((prev) => prev.filter((item) => item.id !== post.id));
      playSound('error');
      toast('Запись удалена', { tone: 'success' });
    } catch (error) {
      toast('Не удалось удалить запись', { description: errorText(error), tone: 'danger' });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <AdminGuard>
      <AppShell>
        <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
          <Link
            href="/admin"
            className="mb-5 inline-flex items-center gap-2 text-[11.5px] text-muted transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Назад в админку
          </Link>

          <PageHeader
            eyebrow={
              <div className="flex items-center gap-2">
                <Badge variant="premium">
                  <Bell className="h-2.5 w-2.5" /> Коммуникации
                </Badge>
                <span className="text-[10.5px] text-muted">уведомление в колокольчик</span>
              </div>
            }
            title="Массовая рассылка"
            subtitle="Сообщение появится в колокольчике у всех незаблокированных пользователей. Без спама — только важное."
            actions={
              <Button variant="ghost" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Обновить
              </Button>
            }
          />

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-5">
              <Card className="p-5 sm:p-6">
                <p className="label">Аудитория</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-xl border border-white/[0.2] bg-white/[0.05] p-3 text-left">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white">
                      <Users className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-medium text-white">Все пользователи</p>
                      <p className="text-[9.5px] text-muted">{recipients.toLocaleString('ru-RU')} человек</p>
                    </div>
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-left opacity-70">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-muted">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-medium text-white">Pro и Premium</p>
                      <p className="text-[9.5px] text-muted">{proCount.toLocaleString('ru-RU')} человек</p>
                    </div>
                    <span className="text-[8.5px] uppercase tracking-[0.12em] text-white/25">скоро</span>
                  </div>
                </div>
                <p className="mt-3 text-[10.5px] leading-relaxed text-muted">
                  Сейчас рассылка уходит всей базе. Сегменты по тарифу и активности появятся после
                  следующего обновления.
                </p>
              </Card>

              <Card className="p-5 sm:p-6">
                <p className="label">Сообщение</p>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] text-white/50">Заголовок</label>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value.slice(0, 160))}
                      placeholder="Например: старт нового марафона"
                      className="input"
                      maxLength={160}
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-[11px] text-white/50">Текст</label>
                      <span className="numeric text-[10px] text-muted">{text.length}/3500</span>
                    </div>
                    <Textarea
                      value={text}
                      onChange={(event) => setText(event.target.value.slice(0, 3500))}
                      placeholder="Коротко и по делу. Что человеку нужно сделать?"
                      className="h-36"
                      maxLength={3500}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
                  <div>
                    <p className="text-[11.5px] font-medium text-white">Дублировать в Telegram</p>
                    <p className="text-[9.5px] text-muted">Бот отправит сообщение в личные чаты</p>
                  </div>
                  <Toggle checked={toTelegram} onChange={setToTelegram} label="Дублировать в Telegram" />
                </div>

                <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[10.5px] text-muted">
                    Получат: <span className="text-white/70">{recipients.toLocaleString('ru-RU')} чел.</span>
                  </p>
                  <Button
                    onClick={() => void send()}
                    disabled={sending || !title.trim() || !text.trim() || !recipients}
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Отправляем…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Отправить
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>

            <div className="space-y-5">
              <Card className="p-5 sm:p-6">
                <p className="label">Превью уведомления</p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-2xl border border-white/[0.1] bg-[#1a1a1d] p-4 shadow-panel"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white font-display text-[9px] font-extrabold text-bg">
                      ЛВС
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                          ЛВС · сейчас
                        </p>
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>
                      <p className="mt-1.5 text-[12.5px] font-semibold text-white">
                        {title || 'Заголовок уведомления'}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[11.5px] leading-relaxed text-white/60">
                        {text || 'Текст появится здесь. Он должен быть коротким и понятным с первого прочтения.'}
                      </p>
                    </div>
                  </div>
                </motion.div>
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/50" />
                  <p className="text-[10.5px] leading-relaxed text-muted">
                    Лучшее время для рассылки — 10:00–12:00 и 19:00–21:00 по часовому поясу пользователя.
                  </p>
                </div>
              </Card>

              <Card className="p-5 sm:p-6">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="label">История</p>
                    <h2 className="mt-1 font-display text-base font-bold text-white">
                      {posts.length} рассылок
                    </h2>
                  </div>
                  <span className="numeric text-[10px] text-muted">
                    {totalSent.toLocaleString('ru-RU')} доставок
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {posts.map((post) => (
                    <div key={post.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-white">
                          {post.title}
                        </p>
                        <button
                          type="button"
                          onClick={() => void remove(post)}
                          disabled={deleting === post.id}
                          aria-label={`Удалить ${post.title}`}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/20 transition-colors hover:bg-danger/[0.08] hover:text-danger disabled:opacity-40"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted">{post.body}</p>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[9.5px] text-muted">
                        <span>
                          Все · {post.sent_count.toLocaleString('ru-RU')} чел.
                          {post.sent_to_telegram ? ' · Telegram' : ''}
                        </span>
                        <span className="numeric">{formatTime(post.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {loading && !posts.length ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : null}
                {!loading && !posts.length ? (
                  <p className="py-8 text-center text-[11.5px] text-muted">Рассылок пока не было.</p>
                ) : null}
              </Card>
            </div>
          </div>
        </div>
      </AppShell>
    </AdminGuard>
  );
}
