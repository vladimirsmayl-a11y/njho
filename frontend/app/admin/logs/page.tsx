'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Info,
  RefreshCw,
  Search,
  Shield,
  XCircle,
} from 'lucide-react';
import { AppShell, Badge, Button, Card, PageHeader, Spinner, playSound, toast } from '@/components/ui';
import { AdminGuard } from '@/components/admin-guard';
import { api, errorText } from '@/lib/api';
import { cn } from '@/lib/utils';

const LEVELS = ['all', 'info', 'warn', 'error'] as const;

const levelMeta = {
  info: { label: 'Info', variant: 'free' as const, icon: Info, className: 'text-[#7FC8FF]' },
  warn: { label: 'Warn', variant: 'premium' as const, icon: AlertTriangle, className: 'text-premium' },
  error: { label: 'Error', variant: 'danger' as const, icon: XCircle, className: 'text-danger' },
};

type LogRow = {
  id: number;
  time: string;
  level: 'info' | 'warn' | 'error';
  actor: string;
  action: string;
  message: string;
};

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api<LogRow[]>(`/admin/logs?level=${level === 'all' ? 'all' : level}&limit=200`);
      setLogs(Array.isArray(rows) ? rows : []);
    } catch (error) {
      toast('Не удалось загрузить логи', { description: errorText(error), tone: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [level]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        const q = query.trim().toLowerCase();
        return (
          !q ||
          log.message.toLowerCase().includes(q) ||
          log.actor.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q)
        );
      }),
    [logs, query],
  );

  const counts = useMemo(
    () => ({
      info: logs.filter((log) => log.level === 'info').length,
      warn: logs.filter((log) => log.level === 'warn').length,
      error: logs.filter((log) => log.level === 'error').length,
    }),
    [logs],
  );

  const exportCsv = () => {
    const header = 'time,level,actor,action,message\n';
    const body = filtered
      .map((log) =>
        [formatTime(log.time), log.level, log.actor, log.action, log.message]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lvs-logs.csv';
    link.click();
    URL.revokeObjectURL(url);
    playSound('spark');
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
              <Badge variant="pro">
                <Shield className="h-2.5 w-2.5" /> Аудит
              </Badge>
            }
            title="Логи системы"
            subtitle="Действия администраторов, рассылки, блокировки и ошибки. Записи хранятся 90 дней."
            actions={
              <>
                <Button variant="ghost" onClick={() => void load()}>
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Обновить
                </Button>
                <Button variant="ghost" onClick={exportCsv} disabled={!filtered.length}>
                  <Download className="h-4 w-4" /> Экспорт CSV
                </Button>
              </>
            }
          />

          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Событий', value: counts.info, icon: CheckCircle2, accent: 'text-white/70' },
              { label: 'Предупреждений', value: counts.warn, icon: AlertTriangle, accent: 'text-premium' },
              { label: 'Ошибок', value: counts.error, icon: XCircle, accent: 'text-danger' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="flex items-center justify-between p-4">
                  <div>
                    <p className="label">{item.label}</p>
                    <p className="numeric mt-2 font-display text-[24px] font-extrabold leading-none text-white">
                      {item.value}
                    </p>
                  </div>
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]', item.accent)}>
                    <Icon className="h-4 w-4" />
                  </span>
                </Card>
              );
            })}
          </div>

          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1.5">
                {LEVELS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setLevel(item)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-[10.5px] capitalize transition-colors',
                      level === item
                        ? 'border-white bg-white text-bg'
                        : 'border-white/[0.08] text-muted hover:text-white',
                    )}
                  >
                    {item === 'all' ? 'Все' : item}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Поиск по событиям…"
                  className="input h-9 w-full py-0 pl-9 text-[11.5px] sm:w-64"
                />
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr>
                    {['Время', 'Уровень', 'Источник', 'Событие'].map((header) => (
                      <th key={header} className="pb-3 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => {
                    const meta = levelMeta[log.level] ?? levelMeta.info;
                    const Icon = meta.icon;
                    return (
                      <tr key={log.id} className="border-t border-white/[0.05] hover:bg-white/[0.03]">
                        <td className="numeric whitespace-nowrap py-3 pr-3 text-[11px] text-muted">{formatTime(log.time)}</td>
                        <td className="py-3 pr-3">
                          <Badge variant={meta.variant}>
                            <Icon className="h-2.5 w-2.5" /> {meta.label}
                          </Badge>
                        </td>
                        <td className="py-3 pr-3">
                          <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-white/60">
                            {log.actor}
                          </span>
                        </td>
                        <td className="py-3 text-[11.5px] text-white/80">
                          {log.message || log.action}
                          <span className="ml-2 text-[9px] uppercase tracking-[0.12em] text-white/20">{log.action}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {loading && !filtered.length ? (
                <div className="flex justify-center py-10">
                  <Spinner />
                </div>
              ) : null}
              {!loading && !filtered.length ? (
                <p className="py-10 text-center text-[12px] text-muted">Событий не найдено.</p>
              ) : null}
            </div>
          </Card>
        </div>
      </AppShell>
    </AdminGuard>
  );
}
