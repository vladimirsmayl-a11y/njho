'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Flag,
  Image as ImageIcon,
  MessageSquareOff,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AppShell,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  PageHeader,
  Progress,
  Spinner,
  Textarea,
  Toggle,
  playSound,
  toast,
} from '@/components/ui';
import { AdminGuard } from '@/components/admin-guard';
import { MarathonCover } from '@/components/marathon-cover';
import { api, body, errorText } from '@/lib/api';
import { COVER_PRESETS } from '@/lib/marathons';
import { cn } from '@/lib/utils';

type AdminTask = {
  id: number;
  title: string;
  description: string;
  due_on?: string | null;
  position: number;
};

type AdminMarathon = {
  id: number;
  title: string;
  description: string;
  starts_on: string;
  ends_on: string;
  premium_only: boolean;
  is_published: boolean;
  tasks?: AdminTask[];
  members: number;
};

type Report = {
  id: number;
  username: string;
  task: string;
  task_id?: number;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string | null;
  has_image: boolean;
  image_url?: string | null;
  created_at: string;
};

type MarathonForm = {
  title: string;
  description: string;
  starts_on: string;
  ends_on: string;
  premium_only: boolean;
  is_published: boolean;
};

type TaskForm = {
  title: string;
  description: string;
  due_on: string;
};

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayIso() {
  return isoDate(new Date());
}

function inDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const EMPTY_FORM: MarathonForm = {
  title: '',
  description: '',
  starts_on: todayIso(),
  ends_on: inDays(21),
  premium_only: false,
  is_published: true,
};

const EMPTY_TASK: TaskForm = { title: '', description: '', due_on: '' };

const STATUS_LABEL: Record<Report['status'], string> = {
  pending: 'На проверке',
  approved: 'Принято',
  rejected: 'Доработать',
};

export default function AdminMarathonsPage() {
  const [marathons, setMarathons] = useState<AdminMarathon[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [reportFilter, setReportFilter] = useState<'all' | Report['status']>('pending');

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [form, setForm] = useState<MarathonForm>(EMPTY_FORM);
  const [taskForm, setTaskForm] = useState<TaskForm>(EMPTY_TASK);
  const [comment, setComment] = useState<Record<number, string>>({});

  const selected = useMemo(
    () => marathons.find((item) => item.id === selectedId) || marathons[0] || null,
    [marathons, selectedId],
  );

  const load = useCallback(async (preferId?: number) => {
    setLoading(true);
    try {
      const rows = await api<AdminMarathon[]>('/admin/marathons');
      const list = Array.isArray(rows) ? rows : [];
      setMarathons(list);
      setSelectedId((current) => {
        if (preferId && list.some((item) => item.id === preferId)) return preferId;
        if (current && list.some((item) => item.id === current)) return current;
        return list[0]?.id ?? null;
      });
    } catch (error) {
      toast('Не удалось загрузить марафоны', { description: errorText(error), tone: 'danger' });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReports = useCallback(async (marathonId: number | null) => {
    if (!marathonId) {
      setReports([]);
      return;
    }
    setReportsLoading(true);
    try {
      const rows = await api<Report[]>(`/admin/marathons/${marathonId}/reports`);
      setReports(Array.isArray(rows) ? rows : []);
    } catch (error) {
      setReports([]);
      toast('Не удалось загрузить отчёты', { description: errorText(error), tone: 'danger' });
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadReports(selected?.id ?? null);
  }, [selected?.id, loadReports]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((report) => {
      if (reportFilter !== 'all' && report.status !== reportFilter) return false;
      if (!q) return true;
      return (
        report.username.toLowerCase().includes(q) ||
        report.task.toLowerCase().includes(q) ||
        report.text.toLowerCase().includes(q)
      );
    });
  }, [reports, reportFilter, query]);

  const progress = useMemo(() => {
    if (!selected?.tasks?.length) return 0;
    const approved = reports.filter((report) => report.status === 'approved').length;
    return Math.min(100, Math.round((approved / selected.tasks.length) * 100));
  }, [reports, selected]);

  const createMarathon = async () => {
    if (!form.title.trim()) {
      toast('Введите название марафона', { tone: 'danger' });
      return;
    }
    setBusy(true);
    try {
      const created = await api<AdminMarathon>('/admin/marathons', {
        method: 'POST',
        body: body({
          title: form.title.trim(),
          description: form.description.trim(),
          starts_on: form.starts_on,
          ends_on: form.ends_on,
          premium_only: form.premium_only,
          is_published: form.is_published,
        }),
      });
      await load(created.id);
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      playSound('levelup');
      toast('Марафон создан', { description: form.title.trim(), tone: 'success' });
    } catch (error) {
      toast('Не удалось создать марафон', { description: errorText(error), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const openEdit = () => {
    if (!selected) return;
    setForm({
      title: selected.title,
      description: selected.description,
      starts_on: selected.starts_on,
      ends_on: selected.ends_on,
      premium_only: selected.premium_only,
      is_published: selected.is_published,
    });
    setEditOpen(true);
  };

  const saveMarathon = async () => {
    if (!selected) return;
    if (!form.title.trim()) {
      toast('Введите название марафона', { tone: 'danger' });
      return;
    }
    setBusy(true);
    try {
      await api(`/admin/marathons/${selected.id}`, {
        method: 'PATCH',
        body: body({
          title: form.title.trim(),
          description: form.description.trim(),
          starts_on: form.starts_on,
          ends_on: form.ends_on,
          premium_only: form.premium_only,
          is_published: form.is_published,
        }),
      });
      await load(selected.id);
      setEditOpen(false);
      playSound('spark');
      toast('Марафон обновлён', { description: form.title.trim(), tone: 'success' });
    } catch (error) {
      toast('Не удалось сохранить', { description: errorText(error), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const togglePublished = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api(`/admin/marathons/${selected.id}`, {
        method: 'PATCH',
        body: body({ is_published: !selected.is_published }),
      });
      await load(selected.id);
      playSound('click');
      toast(selected.is_published ? 'Марафон снят с публикации' : 'Марафон опубликован', {
        tone: 'success',
      });
    } catch (error) {
      toast('Не удалось изменить публикацию', { description: errorText(error), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const addTask = async () => {
    if (!selected) return;
    if (!taskForm.title.trim()) {
      toast('Введите название задания', { tone: 'danger' });
      return;
    }
    setBusy(true);
    try {
      await api(`/admin/marathons/${selected.id}/tasks`, {
        method: 'POST',
        body: body({
          title: taskForm.title.trim(),
          description: taskForm.description.trim(),
          due_on: taskForm.due_on || null,
        }),
      });
      await load(selected.id);
      setTaskForm(EMPTY_TASK);
      playSound('spark');
      toast('Задание добавлено', { description: taskForm.title.trim(), tone: 'success' });
    } catch (error) {
      toast('Не удалось добавить задание', { description: errorText(error), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const deleteTask = async (task: AdminTask) => {
    if (!window.confirm(`Удалить задание «${task.title}»?`)) return;
    setBusy(true);
    try {
      await api(`/admin/marathon-tasks/${task.id}`, { method: 'DELETE' });
      await load(selected?.id);
      playSound('error');
      toast('Задание удалено', { tone: 'success' });
    } catch (error) {
      toast('Не удалось удалить задание', { description: errorText(error), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const review = async (report: Report, status: 'approved' | 'rejected') => {
    if (!selected) return;
    setBusy(true);
    try {
      await api(`/admin/reports/${report.id}/review`, {
        method: 'POST',
        body: body({ status, comment: (comment[report.id] || '').trim() || null }),
      });
      await loadReports(selected.id);
      playSound(status === 'approved' ? 'levelup' : 'click');
      toast(status === 'approved' ? 'Задание принято' : 'Отправлено на доработку', {
        description: `@${report.username} · ${report.task}`,
        tone: status === 'approved' ? 'success' : 'default',
      });
    } catch (error) {
      toast('Не удалось проверить отчёт', { description: errorText(error), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const clearChat = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await api<{ deleted: number }>(`/admin/marathons/${selected.id}/chat/clear`, {
        method: 'POST',
      });
      setClearOpen(false);
      playSound('error');
      toast('Чат очищен', { description: `Удалено сообщений: ${result?.deleted ?? 0}`, tone: 'success' });
    } catch (error) {
      toast('Не удалось очистить чат', { description: errorText(error), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const pendingCount = reports.filter((report) => report.status === 'pending').length;

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
                  <ShieldCheck className="h-2.5 w-2.5" /> Владелец
                </Badge>
                <span className="text-[10.5px] text-muted">управление программами и проверка</span>
              </div>
            }
            title="Марафоны"
            subtitle="Создание программ, задания, очередь проверки и очистка чата. Все действия попадают в логи."
            actions={
              <>
                <Button variant="ghost" onClick={() => void load(selected?.id)} disabled={loading}>
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Обновить
                </Button>
                <Button
                  onClick={() => {
                    setForm(EMPTY_FORM);
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Создать
                </Button>
              </>
            }
          />

          {loading && !marathons.length ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Spinner />
            </div>
          ) : !marathons.length ? (
            <Card className="p-12 text-center">
              <Flag className="mx-auto h-8 w-8 text-muted" />
              <p className="mt-3 font-display text-base font-bold text-white">Марафонов пока нет</p>
              <p className="mt-1 text-[12px] text-muted">
                Создайте первую программу, добавьте задания и опубликуйте её.
              </p>
              <Button
                className="mt-5"
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setCreateOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Создать марафон
              </Button>
            </Card>
          ) : (
            <>
              <div className="grid gap-5 xl:grid-cols-[1.15fr_1.5fr]">
                {/* Список */}
                <Card className="p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="label">Каталог</p>
                      <h2 className="mt-1 font-display text-lg font-bold text-white">
                        {marathons.length} программ
                      </h2>
                    </div>
                    <Badge variant="free">{marathons.filter((item) => item.is_published).length} опубл.</Badge>
                  </div>

                  <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
                    {marathons.map((item) => {
                      const active = item.id === selected?.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(item.id);
                            playSound('click');
                          }}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-all',
                            active
                              ? 'border-white/[0.24] bg-white/[0.06]'
                              : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.04]',
                          )}
                        >
                          <MarathonCover
                            icon="sunrise"
                            cover={COVER_PRESETS[item.id % COVER_PRESETS.length].cover}
                            accent="text-white"
                            size="sm"
                            className="h-14 w-16 shrink-0 rounded-lg"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-[12.5px] font-semibold text-white">{item.title}</p>
                              {!item.is_published ? <Badge variant="free">черновик</Badge> : null}
                            </div>
                            <p className="mt-0.5 text-[10px] text-muted">
                              {formatDate(item.starts_on)} — {formatDate(item.ends_on)} · {item.members} участников
                            </p>
                            <p className="mt-1 text-[9.5px] text-white/35">
                              {item.tasks?.length ?? 0} заданий
                            </p>
                          </div>
                          <ChevronHint active={active} />
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {/* Выбранный марафон */}
                <div className="space-y-5">
                  <Card className="overflow-hidden">
                    <MarathonCover
                      icon="sunrise"
                      cover={COVER_PRESETS[selected.id % COVER_PRESETS.length].cover}
                      accent="text-white"
                      size="sm"
                      className="h-28"
                    >
                      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                        {selected.premium_only ? <Badge variant="premium">Premium</Badge> : <Badge variant="free">Все тарифы</Badge>}
                        <Badge variant={selected.is_published ? 'pro' : 'free'}>
                          {selected.is_published ? 'Опубликован' : 'Черновик'}
                        </Badge>
                      </div>
                      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between text-[10px] text-white/70">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(selected.starts_on)} — {formatDate(selected.ends_on)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {selected.members}
                        </span>
                      </div>
                    </MarathonCover>
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="font-display text-lg font-bold text-white">{selected.title}</h2>
                          <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                            {selected.description || 'Без описания'}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button size="sm" variant="ghost" onClick={openEdit}>
                            <Pencil className="h-3.5 w-3.5" /> Изменить
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => void togglePublished()} disabled={busy}>
                            {selected.is_published ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                            {selected.is_published ? 'Снять' : 'Опубликовать'}
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <Progress value={progress} className="h-1 flex-1" />
                        <span className="numeric text-[10px] text-white/50">{progress}% принято</span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" variant="ghost" href={`/marathons/${selected.id}`}>
                          Открыть как участник
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setClearOpen(true)}>
                          <MessageSquareOff className="h-3.5 w-3.5" /> Почистить чат
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Задания */}
                  <Card className="p-4 sm:p-5">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="label">Программа</p>
                        <h2 className="mt-1 font-display text-base font-bold text-white">
                          Задания · {selected.tasks?.length ?? 0}
                        </h2>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {(selected.tasks ?? []).map((task, index) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
                        >
                          <span className="numeric mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.1] text-[10px] text-white/40">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold text-white">{task.title}</p>
                            {task.description ? (
                              <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{task.description}</p>
                            ) : null}
                            {task.due_on ? (
                              <p className="mt-1 flex items-center gap-1 text-[9.5px] text-white/30">
                                <Clock className="h-2.5 w-2.5" /> до {formatDate(task.due_on)}
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => void deleteTask(task)}
                            disabled={busy}
                            aria-label={`Удалить ${task.title}`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/20 transition-colors hover:bg-danger/[0.08] hover:text-danger disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {!selected.tasks?.length ? (
                        <p className="rounded-xl border border-dashed border-white/[0.1] px-3 py-6 text-center text-[11px] text-muted">
                          Заданий пока нет. Добавьте первое ниже.
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
                      <Input
                        value={taskForm.title}
                        onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="Название задания"
                        maxLength={160}
                      />
                      <Textarea
                        value={taskForm.description}
                        onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))}
                        placeholder="Что нужно сделать и что приложить"
                        className="h-20"
                        maxLength={5000}
                      />
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          type="date"
                          value={taskForm.due_on}
                          onChange={(event) => setTaskForm((prev) => ({ ...prev, due_on: event.target.value }))}
                          aria-label="Дедлайн задания"
                          className="sm:w-44"
                        />
                        <Button
                          className="flex-1"
                          onClick={() => void addTask()}
                          disabled={busy || !taskForm.title.trim()}
                        >
                          <Plus className="h-4 w-4" /> Добавить задание
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Очередь проверки */}
              <Card className="mt-5 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="label">Проверка</p>
                    <h2 className="mt-1 flex items-center gap-2 font-display text-lg font-bold text-white">
                      Отчёты участников
                      {pendingCount ? (
                        <span className="numeric rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-medium text-white/70">
                          {pendingCount} ждут
                        </span>
                      ) : null}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['pending', 'approved', 'rejected', 'all'] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setReportFilter(item)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-[10px] transition-colors',
                          reportFilter === item
                            ? 'border-white bg-white text-bg'
                            : 'border-white/[0.08] text-muted hover:text-white',
                        )}
                      >
                        {item === 'all' ? 'Все' : STATUS_LABEL[item]}
                      </button>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void loadReports(selected.id)}
                      disabled={reportsLoading}
                    >
                      <RefreshCw className={cn('h-3.5 w-3.5', reportsLoading && 'animate-spin')} />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {filtered.map((report) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[12px] font-semibold text-white">@{report.username}</p>
                            <Badge
                              variant={
                                report.status === 'approved'
                                  ? 'pro'
                                  : report.status === 'rejected'
                                    ? 'danger'
                                    : 'premium'
                              }
                            >
                              {STATUS_LABEL[report.status]}
                            </Badge>
                          </div>
                          <p className="mt-1 text-[10.5px] text-muted">{report.task}</p>
                        </div>
                        <span className="numeric text-[9.5px] text-white/30">{formatTime(report.created_at)}</span>
                      </div>

                      {report.text ? (
                        <p className="mt-2.5 whitespace-pre-wrap text-[11.5px] leading-relaxed text-white/70">
                          {report.text}
                        </p>
                      ) : null}

                      {report.has_image ? (
                        <a
                          href={
                            report.image_url ||
                            `/api/marathons/${selected.id}/tasks/${report.task_id}/report/image`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[10px] text-white/60 transition-colors hover:text-white"
                        >
                          <ImageIcon className="h-3 w-3" /> Фото-подтверждение
                        </a>
                      ) : null}

                      {report.status === 'pending' ? (
                        <div className="mt-3 space-y-2">
                          <Input
                            value={comment[report.id] || ''}
                            onChange={(event) =>
                              setComment((prev) => ({ ...prev, [report.id]: event.target.value }))
                            }
                            placeholder="Комментарий участнику (необязательно)"
                            maxLength={400}
                            className="h-9 text-[11px]"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => void review(report, 'approved')}
                              disabled={busy}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Принять
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              className="flex-1"
                              onClick={() => void review(report, 'rejected')}
                              disabled={busy}
                            >
                              <X className="h-3.5 w-3.5" /> Доработать
                            </Button>
                          </div>
                        </div>
                      ) : report.comment ? (
                        <p className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[10px] text-muted">
                          Комментарий: {report.comment}
                        </p>
                      ) : null}
                    </motion.div>
                  ))}
                </div>

                {reportsLoading && !filtered.length ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : null}
                {!reportsLoading && !filtered.length ? (
                  <p className="py-8 text-center text-[11.5px] text-muted">
                    {reportFilter === 'pending' ? 'Очередь проверки пуста.' : 'Отчётов не найдено.'}
                  </p>
                ) : null}
              </Card>
            </>
          )}
        </div>

        {/* Создание */}
        <Modal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Новый марафон"
          subtitle="Название, даты и доступ. Задания добавим после создания."
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={busy}>
                Отмена
              </Button>
              <Button onClick={() => void createMarathon()} disabled={busy || !form.title.trim()}>
                <Plus className="h-4 w-4" /> Создать
              </Button>
            </div>
          }
        >
          <MarathonFields form={form} setForm={setForm} />
        </Modal>

        {/* Редактирование */}
        <Modal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title="Редактировать марафон"
          subtitle={selected?.title}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={busy}>
                Отмена
              </Button>
              <Button onClick={() => void saveMarathon()} disabled={busy || !form.title.trim()}>
                <Check className="h-4 w-4" /> Сохранить
              </Button>
            </div>
          }
        >
          <MarathonFields form={form} setForm={setForm} />
        </Modal>

        {/* Очистка чата */}
        <Modal
          open={clearOpen}
          onClose={() => setClearOpen(false)}
          title="Почистить чат?"
          subtitle={selected?.title}
          width="max-w-md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setClearOpen(false)} disabled={busy}>
                Отмена
              </Button>
              <Button variant="danger" onClick={() => void clearChat()} disabled={busy}>
                <Trash2 className="h-4 w-4" /> Удалить сообщения
              </Button>
            </div>
          }
        >
          <p className="text-[12px] leading-relaxed text-muted">
            Все сообщения общего чата этого марафона будут удалены без возможности восстановления.
            Задания и отчёты останутся на месте.
          </p>
        </Modal>
      </AppShell>
    </AdminGuard>
  );
}

function ChevronHint({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors',
        active ? 'border-white/30 text-white' : 'border-white/[0.08] text-white/20',
      )}
      aria-hidden
    >
      <Check className={cn('h-3.5 w-3.5', !active && 'opacity-0')} />
    </span>
  );
}

function MarathonFields({
  form,
  setForm,
}: {
  form: MarathonForm;
  setForm: React.Dispatch<React.SetStateAction<MarathonForm>>;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-[11px] text-white/50">Название</label>
        <Input
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Например: Утренний подъём"
          maxLength={160}
          autoFocus
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] text-white/50">Описание</label>
        <Textarea
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Коротко: для кого и что изменится за программу"
          className="h-24"
          maxLength={5000}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[11px] text-white/50">Старт</label>
          <Input
            type="date"
            value={form.starts_on}
            onChange={(event) => setForm((prev) => ({ ...prev, starts_on: event.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] text-white/50">Финиш</label>
          <Input
            type="date"
            value={form.ends_on}
            onChange={(event) => setForm((prev) => ({ ...prev, ends_on: event.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <div>
            <p className="text-[11.5px] font-medium text-white">Только Premium</p>
            <p className="text-[9.5px] text-muted">Остальные увидят марафон, но не смогут вступить</p>
          </div>
          <Toggle
            checked={form.premium_only}
            onChange={(value) => setForm((prev) => ({ ...prev, premium_only: value }))}
            label="Только Premium"
          />
        </label>
        <div className="h-px bg-white/[0.06]" />
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <div>
            <p className="text-[11.5px] font-medium text-white">Опубликовать сразу</p>
            <p className="text-[9.5px] text-muted">Черновик не виден участникам</p>
          </div>
          <Toggle
            checked={form.is_published}
            onChange={(value) => setForm((prev) => ({ ...prev, is_published: value }))}
            label="Опубликовать"
          />
        </label>
      </div>
    </div>
  );
}
