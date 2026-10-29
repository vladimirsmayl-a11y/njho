'use client';

import { ArrowLeft, Check, ChevronDown, Lock, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { TelegramIcon } from '@/components/icons';
import { ErrorNote, Spinner, toast } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { api, body, errorText, isNetworkError } from '@/lib/api';

type Phase = 'idle' | 'creating' | 'waiting' | 'expired';

function formatCode(value: string) {
  const raw = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
  return raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, enterDemo, refresh } = useAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [token, setToken] = useState<string | null>(null);
  const [botUrl, setBotUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const exchanging = useRef(false);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotOk, setForgotOk] = useState(false);

  const openDemo = () => {
    enterDemo();
    toast('Демо-режим', {
      description: 'Сервис недоступен — открываем платформу с локальными данными',
    });
    router.replace('/dashboard');
  };

  const start = async () => {
    setError(null);
    setPhase('creating');
    try {
      const session = await api<{ token: string; bot_url: string }>('/auth/session', {
        method: 'POST',
      });
      setToken(session.token);
      setBotUrl(session.bot_url);
      setPhase('waiting');
    } catch (e) {
      if (isNetworkError(e)) {
        openDemo();
        return;
      }
      setError(errorText(e));
      setPhase('idle');
    }
  };

  useEffect(() => {
    if (phase !== 'waiting' || !token) return;

    const timer = setInterval(async () => {
      if (exchanging.current) return;
      try {
        const { status } = await api<{ status: 'pending' | 'confirmed' | 'expired' }>(
          `/auth/session/${token}`,
        );
        if (status === 'expired') {
          setPhase('expired');
        } else if (status === 'confirmed') {
          exchanging.current = true;
          await api('/auth/exchange', { method: 'POST', body: body({ token }) });
          await refresh();
          router.replace('/dashboard');
        }
      } catch {
        exchanging.current = false;
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [phase, token, router, refresh]);

  const passwordLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setPwBusy(true);
    try {
      await login(identifier, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(errorText(err));
      setPwBusy(false);
    }
  };

  const codeLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setCodeBusy(true);
    try {
      await api('/auth/exchange', { method: 'POST', body: body({ code }) });
      await refresh();
      router.replace('/dashboard');
    } catch (err) {
      if (isNetworkError(err)) {
        openDemo();
        return;
      }
      setError(errorText(err));
      setCodeBusy(false);
    }
  };

  const forgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setForgotBusy(true);
    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: body({ identifier: forgotEmail }),
      });
      setForgotOk(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setForgotBusy(false);
    }
  };

  const codeReady = code.replace('-', '').length === 8;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-neon/[0.06] blur-[120px]"
      />

      <div className="relative w-full max-w-[440px]">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-[12px] text-white/35 transition hover:text-white/70"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          На главную
        </Link>

        <div className="card p-7 shadow-[0_50px_140px_-70px_rgba(0,0,0,1)] sm:p-9">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-display text-[14px] font-extrabold uppercase leading-none tracking-[0.38em] text-white">
                ЛВС
              </span>
              <span className="h-1 w-1 rounded-full bg-white/50" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/40">
              <Lock className="h-3 w-3 text-white/50" />
              Безопасный вход
            </span>
          </div>

          <h1 className="mt-8 font-display text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-white">
            Вход в кабинет
          </h1>
          <p className="mt-2.5 text-[13px] leading-relaxed text-white/45">
            Войдите через Telegram — без паролей и лишних шагов.
          </p>

          {phase === 'idle' && (
            <>
              <button
                type="button"
                onClick={start}
                className="btn btn-primary group mt-7 w-full !justify-start !gap-3 !px-5 !py-4 text-[14px]"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#229ED9] text-white">
                  <TelegramIcon className="h-[17px] w-[17px]" />
                </span>
                <span className="flex-1 text-left font-semibold">Войти через Telegram</span>
                <ArrowLeft className="h-4 w-4 rotate-180 text-black/30 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>

              <p className="mt-3 text-center text-[11px] leading-relaxed text-white/30">
                Бот пришлёт ник и пароль один раз — при регистрации.
              </p>

              <div className="my-7 flex items-center gap-3">
                <span className="h-px flex-1 bg-white/[0.07]" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/25">
                  или по коду
                </span>
                <span className="h-px flex-1 bg-white/[0.07]" />
              </div>

              <form onSubmit={codeLogin}>
                <label
                  htmlFor="login-code"
                  className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40"
                >
                  Код из бота
                </label>
                <input
                  id="login-code"
                  className="input mt-2.5 text-center font-mono text-[17px] uppercase tracking-[0.32em] placeholder:tracking-[0.32em] placeholder:text-white/15"
                  placeholder="XXXX-XXXX"
                  inputMode="text"
                  autoComplete="one-time-code"
                  spellCheck={false}
                  value={code}
                  onChange={(e) => setCode(formatCode(e.target.value))}
                  aria-describedby="login-code-hint"
                />
                <button
                  type="submit"
                  disabled={!codeReady || codeBusy}
                  className="btn btn-ghost mt-3 w-full !py-3.5 text-[13px] disabled:opacity-30"
                >
                  {codeBusy ? <Spinner className="h-4 w-4" /> : 'Войти по коду'}
                </button>
                <p id="login-code-hint" className="mt-3 text-[11px] leading-relaxed text-white/30">
                  Нажмите «Авторизоваться на сайте» в боте — код действует 10 минут.
                </p>
              </form>

              <details className="group mt-7 border-t border-white/[0.07] pt-6">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[12px] text-white/35 transition hover:text-white/70">
                  Войти по нику и паролю
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300 group-open:rotate-180" />
                </summary>

                <form onSubmit={passwordLogin} className="mt-5 space-y-3">
                  <input
                    className="input"
                    placeholder="Ник или email"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                  <input
                    className="input"
                    type="password"
                    placeholder="Пароль"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    disabled={pwBusy}
                    className="btn btn-ghost w-full !py-3.5 text-[13px]"
                  >
                    {pwBusy ? <Spinner className="h-4 w-4" /> : 'Войти'}
                  </button>
                </form>

                <form onSubmit={forgotPassword} className="mt-6 space-y-3">
                  <p className="text-[11px] text-white/30">Забыли пароль?</p>
                  <input
                    className="input"
                    placeholder="Ваш ник или email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    disabled={forgotBusy}
                    className="btn btn-ghost w-full !py-3 text-[12px]"
                  >
                    {forgotBusy ? (
                      <Spinner className="h-3.5 w-3.5" />
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Прислать новый пароль в бота
                      </>
                    )}
                  </button>
                  {forgotOk && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-neon/25 bg-neon/[0.06] p-3.5">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neon" />
                      <p className="text-[11.5px] leading-relaxed text-white/60">
                        Готово. Откройте бота и нажмите /start — он пришлёт новый временный пароль.
                      </p>
                    </div>
                  )}
                </form>
              </details>
            </>
          )}

          {phase === 'creating' && (
            <div className="mt-8 flex items-center justify-center gap-3 py-6 text-[13px] text-white/45">
              <Spinner className="h-4 w-4" />
              Готовим вход…
            </div>
          )}

          {phase === 'waiting' && (
            <div className="mt-7">
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-4 text-[12.5px] text-white/50">
                <Spinner className="h-4 w-4" />
                Ждём подтверждения в Telegram
              </div>

              {botUrl && (
                <a
                  href={botUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary mt-3 w-full !gap-3 !py-4 text-[14px]"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#229ED9] text-white">
                    <TelegramIcon className="h-[17px] w-[17px]" />
                  </span>
                  Открыть бота
                </a>
              )}

              <p className="mt-4 text-[11.5px] leading-relaxed text-white/30">
                В боте нажмите «Запустить», затем «Авторизоваться на сайте». Эта страница
                войдёт автоматически.
              </p>

              <button
                type="button"
                onClick={() => {
                  exchanging.current = false;
                  setPhase('idle');
                }}
                className="btn btn-ghost mt-4 w-full !py-3 text-[12px]"
              >
                Отменить
              </button>
            </div>
          )}

          {phase === 'expired' && (
            <div className="mt-7">
              <p className="text-[13px] leading-relaxed text-white/50">
                Время на подтверждение вышло. Запустите вход ещё раз.
              </p>
              <button
                type="button"
                onClick={start}
                className="btn btn-primary mt-5 w-full !py-4 text-[14px]"
              >
                Начать заново
              </button>
            </div>
          )}

          {error && (
            <div className="mt-6">
              <ErrorNote message={error} />
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-white/25">
          Вход защищён одноразовым кодом. Пароль нужен только для входа по нику.
        </p>
      </div>
    </main>
  );
}
