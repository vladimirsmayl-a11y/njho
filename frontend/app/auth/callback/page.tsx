'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { api, body, errorText } from '@/lib/api';

/** Страница, на которую ведёт кнопка «Авторизоваться на сайте» из бота. */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = new URLSearchParams(window.location.search).get('code');
    // сразу убираем одноразовый код из адресной строки
    window.history.replaceState(null, '', '/auth/callback');
    if (!code) {
      setError('Ссылка для входа неполная. Начните вход заново.');
      return;
    }
    api('/auth/exchange', { method: 'POST', body: body({ code }) })
      .then(() => refresh())
      .then(() => router.replace('/dashboard'))
      .catch((e) => setError(errorText(e)));
  }, [router, refresh]);

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="card w-full max-w-md p-8 text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Не удалось войти</h1>
            <p className="mb-6 mt-3 text-muted">{error}</p>
            <Link href="/login" className="btn btn-primary">К странице входа</Link>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3 text-muted"><Spinner /> Выполняем вход</div>
        )}
      </div>
    </main>
  );
}
