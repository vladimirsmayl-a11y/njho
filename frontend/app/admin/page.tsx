'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  Ban,
  Bell,
  Check,
  ChevronRight,
  Crown,
  Flag,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AppShell,
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  PageHeader,
  Textarea,
  TierBadge,
  playSound,
  toast,
} from '@/components/ui';
import { AdminGuard } from '@/components/admin-guard';
import { api, body, errorText } from '@/lib/api';
import { cn } from '@/lib/utils';

type Role = 'owner' | 'curator' | 'member';

type AdminUser = {
  id: string;
  username: string;
  email?: string | null;
  telegram_username?: string | null;
  tier: string;
  role: Role;
  is_admin: boolean;
  is_blocked: boolean;
  blocked_reason?: string | null;
  last_seen_at?: string | null;
  created_at?: string | null;
  has_access: boolean;
};

type Stats = {
  users: number;
  dau: number;
  wau: number;
  new_today: number;
  reports_pending: number;
  marathons: number;
  blocked: number;
  active_by_tier: Record<string, number>;
};

type ActivityPoint = { date: string; dau: number; wau: number };

const ROLE_LABEL: Record<Role, string> = {
  owner: 'Владелец',
  curator: 'Куратор',
  member: 'Участник',
};

function relativeTime(iso?: string | null) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} дн назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function ActivityChart({ data }: { data: ActivityPoint[] }) {
  const points = data.length ? data : [{ date: new Date().toISOString(), dau: 0, wau: 0 }];
  const width = 560;
  const height = 180;
  const padding = 12;
  const values = points.flatMap((item) => [item.dau, item.wau]);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(1, max - min);
  const scaleY = (value: number) => height - padding - ((value - min) / span) * (height - padding * 2);
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const line = (key: 'dau' | 'wau') =>
    points
      .map((item, index) => `${index === 0 ? 'M' : 'L'} ${padding + index * stepX} ${scaleY(item[key])}`)
      .join(' ');

  const area = `${line('dau')} L ${padding + (points.length - 1) * stepX} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" role="img" aria-label="График DAU и WAU">
        <defs>
          <linearGradient id="dauFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={padding}
            x2={width - padding}
            y1={padding + ratio * (height - padding * 2)}
            y2={padding + ratio * (height - padding * 2)}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 5"
          />
        ))}
        <motion.path d={area} fill="url(#dauFill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        <motion.path
          d={line('wau')}
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        <motion.path
          d={line('dau')}
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        {points.map((item, index) => (
          <circle
            key={item.date}
            cx={padding + index * stepX}
            cy={scaleY(item.dau)}
            r="3"
            fill="#0A0A0A"
            stroke="#ffffff"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1">
        {points.map((item) => (
          <span key={item.date} className="text-[9px] uppercase tracking-wider text-muted">
            {new Date(item.date).toLocaleDateString('ru-RU', { weekday: 'short' })}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'owner' | 'curator' | 'member' | 'blocked'>('all');
  const [modal, setModal] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState('');
  const [notifyText, setNotifyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [statsData, activityData, usersData] = await Promise.all([
        api<Stats>('/admin/stats'),
        api<ActivityPoint[]>('/admin/activity'),
        api<AdminUser[]>('/admin/users?limit=100'),
      ]);
      setStats(statsData);
      setActivity(Array.isArray(activityData) ? activityData : []);
      setUsers(Array.isArray(usersData) ? usersData.map((u) => ({ ...u, id: String(u.id) })) : []);
    } catch (error) {
      toast('Не удалось загрузить админку', { description: errorText(error), tone: 'danger' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      users.filter((user) => {
        const q = query.trim().toLowerCase();
        const byQuery =
          !q ||
          user.username.toLowerCase().includes(q) ||
          (user.email ?? '').toLowerCase().includes(q) ||
          (user.telegram_username ?? '').toLowerCase().includes(q);
        const byFilter =
          filter === 'all'
            ? true
            : filter === 'blocked'
              ? user.is_blocked
              : user.role === filter;
        return byQuery && byFilter;
      }),
    [users, query, filter],
  );

  const patchUser = async (user: AdminUser, patch: Record<string, unknown>) => {
    setBusy(true);
    try {
      const updated = await api<AdminUser>(`/admin/users/${user.id}`, {
        method: 'PATCH',
        body: body(patch),
      });
      const normalized = { ...updated, id: String(updated.id) };
      setUsers((prev) => prev.map((item) => (item.id === normalized.id ? normalized : item)));
      setModal((prev) => (prev && prev.id === normalized.id ? normalized : prev));
      void load();
      return true;
    } catch (error) {
      toast('Не удалось изменить пользователя', { description: errorText(error), tone: 'danger' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const setRole = async (role: Role) => {
    if (!modal) return;
    const ok = await patchUser(modal, { role });
    if (ok) {
      playSound('click');
      toast('Роль обновлена', { description: `${modal.username} — ${ROLE_LABEL[role]}`, tone: 'success' });
    }
  };

  const setTier = async (tier: string) => {
    if (!modal) return;
    const ok = await patchUser(modal, { tier });
    if (ok) {
      playSound('levelup');
      toast('Тариф обновлён', { description: `${modal.username} — ${tier}`, tone: 'success' });
    }
  };

  const toggleBlock = async () => {
    if (!modal) return;
    const next = !modal.is_blocked;
    if (next && !banReason.trim()) {
      toast('Укажите причину блокировки', { tone: 'danger' });
      return;
    }
    const ok = await patchUser(modal, {
      is_blocked: next,
      blocked_reason: next ? banReason.trim() : null,
    });
    if (ok) {
      playSound(next ? 'error' : 'click');
      toast(next ? 'Пользователь заблокирован' : 'Пользователь разблокирован', {
        description: modal.username,
        tone: next ? 'danger' : 'success',
      });
      setBanReason('');
    }
  };

  const sendNotify = async () => {
    if (!modal || !notifyText.trim()) return;
    setBusy(true);
    try {
      await api(`/admin/users/${modal.id}/notify`, {
        method: 'POST',
        body: body({ text: notifyText.trim() }),
      });
      playSound('spark');
      toast('Уведомление отправлено', { description: modal.username, tone: 'success' });
      setNotifyText('');
    } catch (error) {
      toast('Не удалось отправить', { description: errorText(error), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const kpi = [
    { label: 'DAU', value: stats?.dau ?? 0, hint: 'за сутки', icon: Activity },
    { label: 'WAU', value: stats?.wau ?? 0, hint: 'за 7 дней', icon: Users },
    {
      label: 'Пользователи',
      value: stats?.users ?? 0,
      hint: `+${stats?.new_today ?? 0} за сутки`,
      icon: TrendingUp,
    },
    {
      label: 'На проверке',
      value: stats?.reports_pending ?? 0,
      hint: `${stats?.marathons ?? 0} марафонов`,
      icon: Flag,
    },
  ];

  return (
    <AdminGuard>
      <AppShell>
        <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
          <PageHeader
            eyebrow={
              <div className="flex items-center gap-2">
                <Badge variant="premium">
                  <Shield className="h-2.5 w-2.5" /> Доступ владельца
                </Badge>
                <span className="text-[10.5px] text-muted">проверка роли на сервере</span>
              </div>
            }
            title="Админ-панель"
            subtitle="Активность, пользователи, роли, блокировки и марафоны. Все действия попадают в логи."
            actions={
              <Button href="/admin/marathons">
                <Flag className="h-4 w-4" /> Марафоны
              </Button>
            }
          />

          {/* KPI */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpi.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                >
                  <Card className="p-4 sm:p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="label">{item.label}</p>
                        <p className="numeric mt-2 font-display text-[30px] font-extrabold leading-none text-white">
                          {loading ? '—' : item.value}
                        </p>
                        <p className="mt-2 text-[10.5px] text-muted">{item.hint}</p>
                      </div>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60">
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
            {/* График */}
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="label">Активность</p>
                  <h2 className="mt-1.5 font-display text-lg font-bold text-white">DAU и WAU за неделю</h2>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-4 rounded-full bg-white" /> DAU
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-px w-4 border-t border-dashed border-white/40" /> WAU
                  </span>
                </div>
              </div>
              <div className="mt-5">
                <ActivityChart data={activity} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4">
                <div>
                  <p className="label">Заблокированы</p>
                  <p className="numeric mt-1 text-[16px] font-bold text-white">{stats?.blocked ?? 0}</p>
                </div>
                <div>
                  <p className="label">Pro и Premium</p>
                  <p className="numeric mt-1 text-[16px] font-bold text-white">
                    {(stats?.active_by_tier?.pro ?? 0) + (stats?.active_by_tier?.premium ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="label">Новых сегодня</p>
                  <p className="numeric mt-1 text-[16px] font-bold text-white">{stats?.new_today ?? 0}</p>
                </div>
              </div>
            </Card>

            {/* Быстрые действия */}
            <Card className="flex flex-col p-5 sm:p-6">
              <p className="label">Управление</p>
              <h2 className="mt-1.5 font-display text-lg font-bold text-white">Быстрые действия</h2>
              <div className="mt-4 flex-1 space-y-1.5">
                {[
                  { href: '/admin/marathons', label: 'Марафоны и чат', description: 'Создание, задания, очистка чата', icon: Flag },
                  { href: '/admin/broadcast', label: 'Массовая рассылка', description: 'Уведомление в колокольчик', icon: Bell },
                  { href: '/admin/logs', label: 'Логи системы', description: 'Действия админов и ошибки', icon: Activity },
                  { href: '/admin/marathons', label: 'Проверка заданий', description: 'Очередь куратора', icon: ShieldCheck },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-muted group-hover:text-white">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11.5px] font-medium text-white">{item.label}</p>
                        <p className="text-[9.5px] text-muted">{item.description}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-white/20" />
                    </Link>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Пользователи */}
          <Card className="mt-6 overflow-hidden p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="label">Пользователи</p>
                <h2 className="mt-1.5 font-display text-lg font-bold text-white">
                  Всего {users.length} · владельцев {users.filter((u) => u.role === 'owner').length} · кураторов{' '}
                  {users.filter((u) => u.role === 'curator').length}
                </h2>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ник, почта, Telegram…"
                    className="input h-9 w-full py-0 pl-9 text-[11.5px] sm:w-60"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {(['all', 'owner', 'curator', 'member', 'blocked'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFilter(item)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[9.5px] transition-colors',
                        filter === item
                          ? 'border-white bg-white text-bg'
                          : 'border-white/[0.08] text-muted hover:text-white',
                      )}
                    >
                      {item === 'all'
                        ? 'Все'
                        : item === 'blocked'
                          ? 'Бан'
                          : ROLE_LABEL[item]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr>
                    {['Пользователь', 'Роль', 'Тариф', 'Последний вход', 'Статус', ''].map((header) => (
                      <th
                        key={header}
                        className="pb-3 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02, duration: 0.25 }}
                      className="group cursor-pointer border-t border-white/[0.05] transition-colors hover:bg-white/[0.03]"
                      onClick={() => {
                        setModal(user);
                        setBanReason(user.blocked_reason ?? '');
                        setNotifyText('');
                        playSound('click');
                      }}
                    >
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <Avatar size={32} fallback={user.username} />
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold text-white">{user.username}</p>
                            <p className="truncate text-[9.5px] text-muted">
                              {user.email || (user.telegram_username ? `@${user.telegram_username}` : '—')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant={user.role === 'owner' ? 'premium' : user.role === 'curator' ? 'pro' : 'free'}>
                          {user.role === 'owner' ? <Crown className="h-2.5 w-2.5" /> : null}
                          {ROLE_LABEL[user.role] ?? 'Участник'}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3">
                        <TierBadge tier={user.tier} />
                      </td>
                      <td className="py-3 pr-3 text-[11px] text-muted">{relativeTime(user.last_seen_at)}</td>
                      <td className="py-3 pr-3">
                        {user.is_blocked ? (
                          <Badge variant="danger">
                            <Ban className="h-2.5 w-2.5" /> Бан
                          </Badge>
                        ) : (
                          <Badge variant="free">
                            <span className="h-1.5 w-1.5 rounded-full bg-white/70" /> Активен
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-white/20 transition-colors group-hover:bg-white/[0.06] group-hover:text-white">
                          <UserCog className="h-3.5 w-3.5" />
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length ? (
                <p className="py-10 text-center text-[12px] text-muted">
                  {loading ? 'Загружаем пользователей…' : 'Пользователи не найдены.'}
                </p>
              ) : null}
            </div>
          </Card>
        </div>

        {/* Карточка пользователя */}
        <Modal
          open={Boolean(modal)}
          onClose={() => setModal(null)}
          title={modal?.username}
          subtitle="Роль, тариф, блокировка и уведомление"
          width="max-w-md"
        >
          {modal ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <Avatar size={44} fallback={modal.username} ring />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[13px] font-semibold text-white">{modal.username}</p>
                    <TierBadge tier={modal.tier} />
                    <Badge variant={modal.role === 'owner' ? 'premium' : 'free'}>{ROLE_LABEL[modal.role]}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-muted">
                    {modal.email || 'без почты'} · вход {relativeTime(modal.last_seen_at)}
                  </p>
                </div>
              </div>

              <div>
                <p className="label mb-2">Роль</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['owner', 'curator', 'member'] as Role[]).map((role) => (
                    <Button
                      key={role}
                      size="sm"
                      variant={modal.role === role ? 'primary' : 'ghost'}
                      disabled={busy}
                      onClick={() => void setRole(role)}
                    >
                      {ROLE_LABEL[role]}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="label mb-2">Подписка</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant={modal.tier === 'pro' ? 'primary' : 'ghost'}
                    disabled={busy}
                    onClick={() => void setTier('pro')}
                  >
                    Pro
                  </Button>
                  <Button
                    size="sm"
                    variant={modal.tier === 'premium' ? 'primary' : 'ghost'}
                    disabled={busy}
                    onClick={() => void setTier('premium')}
                  >
                    <Crown className="h-3.5 w-3.5" /> Premium
                  </Button>
                  <Button
                    size="sm"
                    variant={modal.tier === 'none' ? 'primary' : 'ghost'}
                    disabled={busy}
                    onClick={() => void setTier('none')}
                  >
                    Free
                  </Button>
                </div>
              </div>

              <div>
                <p className="label mb-2">Доступ</p>
                {!modal.is_blocked ? (
                  <Input
                    value={banReason}
                    onChange={(event) => setBanReason(event.target.value)}
                    placeholder="Причина блокировки (видна пользователю)"
                    maxLength={200}
                  />
                ) : (
                  <div className="rounded-xl border border-danger/20 bg-danger/[0.04] px-3.5 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-danger/60">Причина</p>
                    <p className="mt-0.5 text-[11.5px] text-danger/85">{modal.blocked_reason || 'не указана'}</p>
                  </div>
                )}
                <Button
                  variant="danger"
                  className="mt-2 w-full justify-start"
                  onClick={() => void toggleBlock()}
                  disabled={busy}
                >
                  <Ban className="h-4 w-4" />
                  {modal.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                </Button>
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <p className="label mb-2">Уведомление в колокольчик</p>
                <Textarea
                  value={notifyText}
                  onChange={(event) => setNotifyText(event.target.value)}
                  placeholder="Например: проверьте оплату — доступ приостановлен."
                  className="h-20"
                  maxLength={1000}
                />
                <Button
                  className="mt-2 w-full"
                  onClick={() => void sendNotify()}
                  disabled={busy || !notifyText.trim()}
                >
                  <Bell className="h-3.5 w-3.5" /> Отправить
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>
      </AppShell>
    </AdminGuard>
  );
}
