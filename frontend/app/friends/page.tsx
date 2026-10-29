'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Flame,
  Search,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AppShell,
  Avatar,
  Badge,
  Button,
  Card,
  InviteModal,
  PageHeader,
  TierBadge,
  playSound,
  toast,
} from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { demoFriends } from '@/lib/demo';
import { copyText, inviteLink } from '@/lib/invite';
import { cn } from '@/lib/utils';

type Friend = (typeof demoFriends)[number];

export default function FriendsPage() {
  const { user } = useAuth();
  const username = user?.username || 'alexey';
  const [friends, setFriends] = useState<Friend[]>(demoFriends);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const remote = await api<Friend[]>('/friends');
        if (alive && Array.isArray(remote)) setFriends(remote);
      } catch {
        /* демо-режим */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(
    () =>
      friends.filter(
        (friend) =>
          !query ||
          friend.username.toLowerCase().includes(query.toLowerCase()) ||
          friend.rank.toLowerCase().includes(query.toLowerCase()),
      ),
    [friends, query],
  );

  const online = friends.filter((friend) => friend.online).length;
  const bestStreak = Math.max(...friends.map((friend) => friend.streak));

  const copyInvite = async () => {
    const ok = await copyText(inviteLink(username, user?.referral_code));
    if (!ok) {
      toast('Не удалось скопировать', {
        description: 'Выделите ссылку на странице приглашения и скопируйте вручную',
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

  return (
    <AppShell>
      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        <PageHeader
          eyebrow={<Badge variant="pro">Круг поддержки</Badge>}
          title="Друзья"
          subtitle="Люди, с которыми проще не бросить. Смотрите серии, звания и приглашайте в марафоны."
          actions={
            <>
              <Button variant="ghost" onClick={copyInvite}>
                {copied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Скопировано' : 'Ссылка-приглашение'}
              </Button>
              <Button onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4" /> Пригласить
              </Button>
            </>
          }
        />

        {/* Сводка */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Друзей в круге', value: friends.length, icon: Users, accent: 'text-white/70' },
            { label: 'Сейчас онлайн', value: online, icon: Sparkles, accent: 'text-[#7FC8FF]' },
            { label: 'Рекорд серии', value: `${bestStreak} дн.`, hint: 'дней подряд', icon: Flame, accent: 'text-[#FF5A36]' },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.4 }}
              >
                <Card className="flex items-center justify-between p-4">
                  <div>
                    <p className="label">{item.label}</p>
                    <p className="numeric mt-2 font-display text-[26px] font-extrabold leading-none text-white">
                      {item.value}
                    </p>
                    {'hint' in item && item.hint ? (
                      <p className="mt-1 text-[10px] text-muted">{item.hint}</p>
                    ) : null}
                  </div>
                  <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]', item.accent)}>
                    <Icon className="h-4 w-4" />
                  </span>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-white">Ваш круг</h2>
            <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-muted">{friends.length}</span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Найти друга…"
              className="input h-10 py-0 pl-9 text-[12px]"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((friend, index) => (
            <motion.div
              key={friend.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
            >
              <Link href={`/friends/${friend.id}`} className="block h-full">
                <Card hover glow className="group h-full p-5">
                  <div className="flex items-start justify-between">
                    <div className="relative">
                      <Avatar size={52} fallback={friend.username} ring={friend.online} />
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#141416]',
                          friend.online ? 'bg-primary' : 'bg-white/25',
                        )}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TierBadge tier={friend.tier} />
                      <ArrowUpRight className="h-4 w-4 text-white/15 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="font-display text-[15px] font-bold text-white">{friend.username}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{friend.tagline}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted">
                        <Flame className="h-3 w-3 text-[#FF5A36]" /> Серия
                      </div>
                      <p className="numeric mt-1 text-[14px] font-bold text-white">{friend.streak} дн.</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted">
                        <CheckCircle2 className="h-3 w-3" /> Задания
                      </div>
                      <p className="numeric mt-1 text-[14px] font-bold text-white">{friend.completed_tasks}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <span className="flex items-center gap-1.5 text-[10.5px] text-muted">
                      <Trophy className="h-3 w-3 text-premium/80" /> {friend.rank}
                    </span>
                    <span className="text-[10.5px] text-primary/0 transition-colors group-hover:text-primary">
                      Открыть профиль →
                    </span>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {!visible.length ? (
          <Card className="mt-4 p-12 text-center">
            <Users className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-3 font-display text-base font-bold text-white">Никого не нашли</p>
            <p className="mt-1 text-[12px] text-muted">Попробуйте другой запрос или пригласите друга.</p>
            <Button className="mt-5" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" /> Пригласить
            </Button>
          </Card>
        ) : null}
      </div>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        username={username}
        code={user?.referral_code}
      />
    </AppShell>
  );
}
