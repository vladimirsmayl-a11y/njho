'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { AppShell, Button, Spinner } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';

/** Админка доступна только владельцу. Проверка дублируется на бэкенде. */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const isOwner = user?.role === 'owner';

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner />
        </div>
      </AppShell>
    );
  }

  if (!isOwner) {
    return (
      <AppShell>
        <div className="flex min-h-[70vh] items-center justify-center px-5 py-12">
          <div className="w-full max-w-md rounded-[26px] border border-white/[0.1] bg-surface/90 p-7 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.04] text-white/70">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h1 className="mt-5 font-display text-xl font-bold text-white">Раздел только для владельца</h1>
            <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted">
              У вашей роли нет доступа к админ-панели. Если это ошибка — напишите в поддержку.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button href="/dashboard">На дашборд</Button>
              <Button variant="ghost" href="/contacts">
                Написать в поддержку
              </Button>
            </div>
            <Link href="/dashboard" className="mt-4 inline-block text-[10.5px] text-white/30 hover:text-white/60">
              Вернуться на главную
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return <>{children}</>;
}
