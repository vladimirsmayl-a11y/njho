'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  HeartHandshake,
  Loader2,
  Lock,
  Mail,
  Menu,
  Send,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { TelegramIcon } from './icons';
import { useAuth } from './auth-provider';
import { api, body, errorText, isNetworkError } from '@/lib/api';

/* ============================================================
   Звуки: тихие, премиальные, генерируются на месте (Web Audio)
   ============================================================ */

type SoundName = 'click' | 'spark' | 'soft';

const SOUND_KEY = 'lvs:sound';

let audioCtx: AudioContext | null = null;

function soundAllowed() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

function blip(
  ctx: AudioContext,
  from: number,
  to: number,
  duration: number,
  peak: number,
  type: OscillatorType,
  delay = 0,
) {
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), start + duration);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

export function playSound(name: SoundName) {
  if (!soundAllowed()) return;
  const ctx = getAudioCtx();
  if (!ctx) return;

  if (name === 'click') {
    blip(ctx, 1240, 780, 0.07, 0.045, 'triangle');
  } else if (name === 'spark') {
    blip(ctx, 880, 1180, 0.16, 0.045, 'sine');
    blip(ctx, 1320, 1760, 0.22, 0.03, 'sine', 0.06);
  } else {
    blip(ctx, 560, 440, 0.05, 0.022, 'sine');
  }
}

/* ============================================================
   Окно авторизации
   ============================================================ */

const AuthModalContext = createContext<{ open: () => void }>({ open: () => {} });

export const useAuthModal = () => useContext(AuthModalContext);

type AuthPhase = 'idle' | 'creating' | 'waiting' | 'expired';

export function LandingAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, login, refresh, enterDemo } = useAuth();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<AuthPhase>('idle');
  const [token, setToken] = useState<string | null>(null);
  const [botUrl, setBotUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const exchanging = useRef(false);

  const close = () => {
    setOpen(false);
    setPhase('idle');
    setToken(null);
    setBotUrl(null);
    setError(null);
    setPassword('');
    setBusy(false);
    exchanging.current = false;
  };

  const openAuth = () => {
    playSound('click');
    if (user) {
      router.push('/dashboard');
      return;
    }
    setOpen(true);
    setError(null);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const finish = async () => {
    await refresh();
    close();
    router.push('/dashboard');
  };

  const startTelegram = async () => {
    setError(null);
    setPhase('creating');
    try {
      const session = await api<{ token: string; bot_url: string }>('/auth/session', {
        method: 'POST',
      });
      setToken(session.token);
      setBotUrl(session.bot_url);
      setPhase('waiting');
      window.open(session.bot_url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      if (isNetworkError(e)) {
        enterDemo();
        close();
        router.push('/dashboard');
        return;
      }
      setError(errorText(e));
      setPhase('idle');
    }
  };

  useEffect(() => {
    if (!open || phase !== 'waiting' || !token) return;

    const timer = window.setInterval(async () => {
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
          await finish();
        }
      } catch {
        exchanging.current = false;
      }
    }, 2000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase, token]);

  const passwordLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(identifier, password);
      close();
      router.push('/dashboard');
    } catch (e) {
      if (isNetworkError(e)) {
        close();
        router.push('/dashboard');
        return;
      }
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <AuthModalContext.Provider value={{ open: openAuth }}>
      {children}

      <AnimatePresence>
        {open && (
          <motion.div
            key="auth"
            className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-5 pt-20 sm:items-center sm:pb-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label="Вход в ЛВС"
          >
            <motion.button
              type="button"
              aria-label="Закрыть окно входа"
              onClick={close}
              className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              initial={{ opacity: 0, y: 64, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.99 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="card relative max-h-[calc(100dvh-6.5rem)] w-full max-w-[420px] overflow-y-auto overscroll-contain p-6 shadow-[0_60px_160px_-50px_rgba(0,0,0,1)] sm:p-7"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
              />

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
                    ЛВС
                  </p>
                  <h2 className="mt-2 font-display text-[24px] font-extrabold tracking-[-0.03em]">
                    Вход в систему
                  </h2>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/45">
                    Вернитесь в ритм — вход занимает меньше минуты.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Закрыть"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-white/50 transition hover:border-white/25 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative mt-6">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-8 bottom-2 h-10 rounded-full bg-white/25 blur-2xl"
                />
                {phase === 'waiting' && botUrl ? (
                  <a
                    href={botUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex w-full items-center justify-center gap-2.5 rounded-full bg-white px-6 py-3.5 text-[14px] font-semibold text-black transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99]"
                  >
                    <TelegramIcon className="h-[18px] w-[18px]" />
                    Открыть Telegram
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={startTelegram}
                    disabled={phase === 'creating'}
                    className="relative flex w-full items-center justify-center gap-2.5 rounded-full bg-white px-6 py-3.5 text-[14px] font-semibold text-black transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
                  >
                    {phase === 'creating' ? (
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                    ) : (
                      <TelegramIcon className="h-[18px] w-[18px]" />
                    )}
                    {phase === 'creating' ? 'Создаём сессию…' : 'Войти через Telegram'}
                  </button>
                )}
              </div>

              {phase === 'waiting' ? (
                <p className="mt-3 flex items-center justify-center gap-2 text-[11.5px] text-white/45">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  Подтвердите вход в боте — страница обновится сама
                </p>
              ) : null}

              {phase === 'expired' ? (
                <p className="mt-3 text-center text-[11.5px] text-white/45">
                  Ссылка устарела. Нажмите кнопку ещё раз, чтобы получить новую.
                </p>
              ) : null}

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-white/[0.08]" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/25">
                  или по почте
                </span>
                <span className="h-px flex-1 bg-white/[0.08]" />
              </div>

              <form onSubmit={passwordLogin} className="space-y-3">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="Email или ник"
                    autoComplete="username"
                    aria-label="Email или ник"
                    className="input !pl-11"
                  />
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Пароль"
                    autoComplete="current-password"
                    aria-label="Пароль"
                    className="input !pl-11"
                  />
                </div>

                {error ? (
                  <p className="rounded-xl border border-[#FF453A]/25 bg-[#FF453A]/[0.08] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#FF8A80]">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={busy || !identifier.trim() || !password}
                  className="btn w-full border border-white/15 bg-white/[0.05] !py-3.5 text-[13.5px] text-white transition hover:border-white/35 hover:bg-white/[0.09] hover:shadow-[0_0_36px_-12px_rgba(255,255,255,0.35)] disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Войти по паролю
                </button>
              </form>

              <p className="mt-5 text-center text-[11px] leading-relaxed text-white/30">
                Ещё нет доступа? Оформите его в{' '}
                <a
                  href="https://t.me/lvs_key_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/55 underline decoration-white/20 underline-offset-2 transition hover:text-white"
                >
                  Telegram-боте
                </a>
                .
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthModalContext.Provider>
  );
}

/* ============================================================
   Шапка
   ============================================================ */

const NAV = [
  { href: '#potential', label: 'Возможности' },
  { href: '#about', label: 'Экосистема' },
  { href: '#pricing', label: 'Тарифы' },
  { href: '#reviews', label: 'Отзывы' },
  { href: '#faq', label: 'FAQ' },
];

export function Header() {
  const auth = useAuthModal();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled || open
          ? 'border-b border-white/[0.07] bg-black/70 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="container-x flex h-[68px] items-center justify-between">
        <Link
          href="/"
          aria-label="ЛВС — на главную"
          className="group flex items-center gap-2.5"
          onClick={() => setOpen(false)}
        >
          <span className="font-display text-[17px] font-extrabold uppercase leading-none tracking-[0.38em] text-white">
            ЛВС
          </span>
          <span className="h-1 w-1 rounded-full bg-neon shadow-[0_0_10px_rgba(0,229,143,0.9)] transition-transform duration-500 group-hover:scale-125" />
        </Link>

        <nav className="hidden items-center gap-9 md:flex" aria-label="Разделы страницы">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="nav-link">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={auth.open}
            className="btn btn-ghost hidden !px-5 !py-2.5 text-[13px] sm:inline-flex"
          >
            Войти
            <ArrowUpRight className="h-3.5 w-3.5 text-white/40" />
          </button>
          <button
            type="button"
            onClick={() => {
              playSound('soft');
              setOpen((v) => !v);
            }}
            aria-expanded={open}
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/12 text-white/80 transition hover:border-white/30 hover:bg-white/5 active:scale-[0.98] md:hidden"
          >
            {open ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-white/[0.06] bg-black/90 backdrop-blur-xl md:hidden"
          >
            <nav className="container-x flex flex-col gap-1 py-5" aria-label="Мобильное меню">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  auth.open();
                }}
                className="btn btn-ghost mt-3 w-full !py-3.5"
              >
                Войти в кабинет
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ============================================================
   Hero
   ============================================================ */

const HABITS = ['Подъём в 6:00', 'Тренировка 45 минут', 'Чтение 20 страниц', 'Дневник вечером'];

function PlannerCard() {
  const [done, setDone] = useState<boolean[]>([true, true, false, false]);
  const [streak, setStreak] = useState(14);
  const [spark, setSpark] = useState(0);
  const [date, setDate] = useState('');

  useEffect(() => {
    setDate(new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date()));
  }, []);

  const completed = done.filter(Boolean).length;
  const progress = Math.round((completed / done.length) * 100);

  const toggle = (index: number) => {
    const next = done.map((value, i) => (i === index ? !value : value));
    setDone(next);
    playSound('click');

    if (next.every(Boolean) && !done.every(Boolean)) {
      setStreak((value) => value + 1);
      setSpark((value) => value + 1);
      playSound('spark');
    }
  };

  return (
    <div className="relative w-full max-w-[440px]">
      <div
        aria-hidden
        className="absolute -inset-8 rounded-[40px] bg-white/[0.05] blur-3xl"
      />
      <div className="card relative overflow-hidden p-6 shadow-[0_50px_140px_-60px_rgba(0,0,0,1)] sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
              Ежедневный планер
            </p>
            <p className="mt-1.5 font-display text-[19px] font-bold tracking-tight">Сегодня</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-white/45">
            {date || '—'}
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-neon/25 bg-neon/10 text-neon">
              <Flame className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Серия</p>
              <p className="font-display text-[17px] font-bold leading-tight">
                {streak}
                <span className="ml-1.5 text-[11px] font-medium text-white/40">дней подряд</span>
              </p>
            </div>
          </div>
          <div className="relative h-5 w-16">
            {spark > 0 && (
              <span
                key={spark}
                className="animate-spark absolute right-0 top-0 whitespace-nowrap text-[11px] font-semibold text-neon"
              >
                +1 день
              </span>
            )}
          </div>
        </div>

        <ul className="mt-5 space-y-1">
          {HABITS.map((habit, index) => (
            <li key={habit}>
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-pressed={done[index]}
                className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.99]"
              >
                <span
                  className={`grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full border transition-all duration-300 ${
                    done[index]
                      ? 'border-neon bg-neon text-ink shadow-[0_0_18px_-2px_rgba(0,229,143,0.8)]'
                      : 'border-white/15 text-transparent group-hover:border-white/30'
                  }`}
                >
                  {done[index] && <Check className="animate-check h-3 w-3" strokeWidth={3.2} />}
                </span>
                <span
                  className={`text-[13.5px] transition-colors ${
                    done[index] ? 'text-white/85' : 'text-white/45'
                  }`}
                >
                  {habit}
                </span>
                <span className="ml-auto font-mono text-[10px] text-white/20">
                  0{index + 1}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-white/[0.07] pt-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-white/35">Выполнено</span>
            <span className="font-mono text-white/55">
              {completed} / {done.length}
            </span>
          </div>
          <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-neon transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, boxShadow: '0 0 14px rgba(0,229,143,0.6)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const auth = useAuthModal();

  return (
    <section className="relative overflow-hidden pb-4 pt-10 md:pb-8 md:pt-14">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[520px] grid-lines opacity-50" />
        <div className="absolute left-1/2 top-[-260px] h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.075),transparent)] blur-2xl" />
        <div className="absolute -left-32 top-32 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.06),transparent)] blur-3xl" />
        <div className="absolute -right-40 top-10 h-96 w-96 rounded-full bg-[radial-gradient(closest-side,rgba(120,150,255,0.09),transparent)] blur-3xl" />
      </div>

      <div className="container-x relative grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="eyebrow"
          >
            <span className="eyebrow-dot" />
            Лучшая версия себя
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.06 }}
            className="display mt-6 text-[44px] leading-[0.95] sm:text-[60px] lg:text-[68px]"
          >
            Дисциплина —<br />
            это{' '}
            <span className="relative inline-block">
              свобода
              <svg
                aria-hidden
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
                className="absolute -bottom-[10px] left-0 h-[9px] w-full text-neon/65"
              >
                <path
                  d="M2 8.5C46 3.5 120 2.5 198 6.5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.14 }}
            className="mt-6 max-w-[460px] text-[15px] leading-relaxed text-white/50 sm:text-base"
          >
            Один планер, мини-трекеры, марафоны и дневник. Система, которая держит ритм
            и считает дни за тебя.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.22 }}
            className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
          >
            <a
              href="#pricing"
              className="btn group w-full border border-white/25 bg-white/[0.03] !px-8 !py-3.5 text-[14px] text-white backdrop-blur transition duration-300 hover:border-white/50 hover:bg-white/[0.07] hover:shadow-[0_0_44px_-10px_rgba(255,255,255,0.45)] sm:w-auto"
            >
              Смотреть тарифы
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
            <button
              type="button"
              onClick={auth.open}
              className="btn w-full border border-white/15 bg-transparent !px-7 !py-3.5 text-[14px] text-white/85 transition duration-300 hover:border-white/35 hover:bg-white/[0.05] hover:text-white hover:shadow-[0_0_34px_-12px_rgba(255,255,255,0.4)] sm:w-auto"
            >
              Войти
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            className="mt-8 hidden flex-wrap items-center gap-x-3 gap-y-2 text-[10px] uppercase tracking-[0.18em] text-white/25 sm:flex"
          >
            <span>Планер</span>
            <span className="h-1 w-1 rounded-full bg-white/25" />
            <span>Мини-трекеры</span>
            <span className="h-1 w-1 rounded-full bg-white/25" />
            <span>Марафоны</span>
            <span className="h-1 w-1 rounded-full bg-white/25" />
            <span>Дневник</span>
          </motion.div>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rotate-12 rounded-[22px] border border-white/10 bg-gradient-to-br from-white/[0.09] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_30px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-md"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-6 -left-2 h-16 w-16 -rotate-6 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-transparent backdrop-blur-md"
          />
          <PlannerCard />
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Возможности
   ============================================================ */

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Ежедневный планер',
    text: 'Планируйте день заранее. Отмечайте выполненное — серия растёт, а вы остаётесь в ритме.',
  },
  {
    icon: Activity,
    title: 'Мини-трекеры',
    text: 'Вода, сон, ходьба и другие базовые привычки — в компактном виде и без лишних усилий.',
  },
  {
    icon: Trophy,
    title: 'Марафоны',
    text: 'Челленджи с заданиями и сроками. Выполняйте задания и сдавайте отчёты в пару касаний.',
  },
  {
    icon: BookOpen,
    title: 'Дневник',
    text: 'Рефлексия и заметки: что получилось сегодня и что стоит изменить завтра.',
  },
];

export function Potential() {
  return (
    <section id="potential" className="container-x scroll-mt-24 py-10 md:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="eyebrow"
        >
          <span className="eyebrow-dot" />
          Возможности
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.06 }}
          className="section-title mt-6"
        >
          Раскрой свой потенциал на максимум
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.12 }}
          className="section-subtitle"
        >
          Четыре инструмента, которые работают вместе — чтобы не терять импульс
          и не возвращаться к нулю.
        </motion.p>
      </div>

      <div className="mt-10 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: index * 0.07 }}
              className="card card-hover group flex h-full flex-col p-6"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-neon/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
              <span className="relative grid h-12 w-12 place-items-center rounded-2xl border border-white/[0.12] bg-gradient-to-b from-white/[0.1] to-white/[0.02] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_18px_30px_-22px_rgba(0,0,0,0.9)] transition-all duration-500 group-hover:border-white/25 group-hover:text-neon">
                <Icon className="h-[19px] w-[19px]" strokeWidth={1.6} />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.16),transparent_65%)]"
                />
              </span>
              <h3 className="mt-6 font-display text-[17px] font-bold leading-snug">
                {feature.title}
              </h3>
              <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-white/55">
                {feature.text}
              </p>
            </motion.article>
          );
        })}
      </div>

      <div className="mt-10 flex justify-center">
        <Link
          href="/login"
          className="btn group border border-white/25 bg-white/[0.03] !px-8 !py-4 text-[14px] text-white transition duration-300 hover:border-white/50 hover:bg-white/[0.07] hover:shadow-[0_0_44px_-10px_rgba(255,255,255,0.45)]"
        >
          Начать использовать планер
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}

/* ============================================================
   Экосистема
   ============================================================ */

const ECOSYSTEM = [
  {
    icon: BookOpen,
    title: 'База знаний',
    text: 'Получайте доступ к полезным материалам, статьям и гайдам по сну, питанию и дисциплине.',
  },
  {
    icon: Users,
    title: 'Активное сообщество',
    text: 'Общайтесь с единомышленниками, участвуйте в марафонах и делитесь успехами в закрытом Telegram-канале.',
  },
  {
    icon: HeartHandshake,
    title: 'Поддержка и кураторство',
    text: 'Не оставайтесь один на один с прокрастинацией — получайте поддержку и мотивацию.',
  },
];

function TelegramMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[336px]">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 rounded-[56px] bg-[radial-gradient(closest-side,rgba(255,255,255,0.1),transparent)] blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-7 top-20 h-24 w-24 rotate-12 rounded-[22px] border border-white/10 bg-gradient-to-br from-white/[0.09] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md"
      />

      <div className="relative overflow-hidden rounded-[34px] border border-white/[0.12] bg-[#0d0d10] shadow-[0_60px_140px_-50px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5 text-[10px] text-white/30">
          <span>9:41</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-white/30" />
            LTE
          </span>
        </div>

        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-gradient-to-br from-white/20 to-white/[0.03] text-[11px] font-bold text-white">
            Л
          </span>
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-white">ЛВС · Бот</p>
            <p className="text-[10px] text-neon/70">в сети</p>
          </div>
          <span className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-white/10 text-white/30">
            <Bell className="h-3.5 w-3.5" strokeWidth={1.6} />
          </span>
        </div>

        <div className="space-y-2.5 px-3.5 py-4">
          <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5">
            <p className="text-[11.5px] leading-relaxed text-white/75">
              Доброе утро. План на сегодня готов: 4 задачи и 3 привычки.
            </p>
          </div>

          <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-white/[0.08] bg-white/[0.04] p-3">
            <div className="flex items-center gap-2 text-[9.5px] uppercase tracking-[0.16em] text-white/35">
              <Flame className="h-3 w-3 text-[#FF5A36]" strokeWidth={2} /> Серия
            </div>
            <p className="mt-1 font-display text-[20px] font-bold leading-none text-white">
              14 <span className="text-[11px] font-medium text-white/40">дней подряд</span>
            </p>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full w-[72%] rounded-full bg-neon/80" />
            </div>
          </div>

          <div className="ml-auto max-w-[78%] rounded-2xl rounded-tr-md border border-white/[0.1] bg-white/[0.09] px-3.5 py-2.5">
            <p className="text-[11.5px] leading-relaxed text-white/85">Тренировка готова ✅</p>
          </div>

          <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5">
            <p className="text-[11.5px] leading-relaxed text-white/75">
              Принято. +1 к серии — вечером не забудь про дневник.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <span className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-center text-[10.5px] text-white/70">
              Открыть планер
            </span>
            <span className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-center text-[10.5px] text-white/70">
              Оценить день
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-white/[0.06] px-3.5 py-3">
          <span className="flex-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-[10.5px] text-white/25">
            Написать сообщение…
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-black">
            <Send className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        </div>
      </div>

      <div className="absolute -bottom-14 left-1/2 z-10 hidden w-max -translate-x-1/2 rounded-2xl border border-white/[0.1] bg-[#141416]/95 px-4 py-2.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,1)] backdrop-blur-xl sm:block">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A36]" />
          <p className="text-[9.5px] uppercase tracking-[0.16em] text-white/40">Напоминание</p>
        </div>
        <p className="mt-1 text-[11px] text-white/80">Вечерний дневник · 21:30</p>
      </div>
    </div>
  );
}

export function Ecosystem() {
  return (
    <section id="about" className="container-x scroll-mt-24 py-10 md:py-20">
      <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="eyebrow"
          >
            <span className="eyebrow-dot" />
            Экосистема
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.06 }}
            className="section-title mt-5"
          >
            Не просто трекер —<br className="hidden sm:block" /> среда, которая держит в ритме
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="mt-4 max-w-[520px] text-[14px] leading-relaxed text-white/45 sm:text-[15px]"
          >
            Инструменты — только половина дела. Вторая половина — знания, люди
            и поддержка, которые не дают сойти с дистанции.
          </motion.p>

          <div className="mt-7 divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {ECOSYSTEM.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.55, delay: index * 0.08 }}
                  className="group flex gap-4 py-5"
                >
                  <span className="relative mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/[0.1] bg-gradient-to-b from-white/[0.09] to-white/[0.02] text-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-500 group-hover:border-white/25 group-hover:text-white">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                  </span>
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-[10px] tracking-[0.18em] text-white/20">
                        0{index + 1}
                      </span>
                      <h3 className="font-display text-[16px] font-bold leading-snug">
                        {item.title}
                      </h3>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
                      {item.text}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-[9.5px] uppercase tracking-[0.16em] text-white/30">
            <span className="rounded-full border border-white/[0.1] px-3 py-1.5">Закрытый канал</span>
            <span className="rounded-full border border-white/[0.1] px-3 py-1.5">Кураторы</span>
            <span className="rounded-full border border-white/[0.1] px-3 py-1.5">Гайды и разборы</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <TelegramMockup />
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================
   Отзывы
   ============================================================ */

type Review = {
  name: string;
  meta: string;
  result: string;
  text: string;
  photo: string;
};

const REVIEWS: Review[] = [
  {
    name: 'Кирилл',
    meta: '32 года',
    result: '90 дней без пропусков',
    text: 'До ЛВС я не мог сесть за работу больше часа — постоянно отвлекался на телефон и соцсети. Проблема была в отсутствии системы: задачи копились, я чувствовал вину, а потом срывался. После двух недель с трекером привычек я вернул контроль: утренний подъём, тренировки, чтение — всё по плану. Теперь у меня уже 90 дней серии без единого пропуска.',
    photo: '/reviews/kirill.jpg',
  },
  {
    name: 'Мария',
    meta: '28 лет',
    result: '12 книг за год',
    text: 'Я всегда хотела читать больше, но откладывала «на потом». Марафоны чтения в ЛВС заставили меня двигаться: каждое задание — это шаг, каждый отчёт — маленькая победа. За год прочитала 12 книг, хотя раньше за год не прочитывала и трёх.',
    photo: '/reviews/maria.jpg',
  },
  {
    name: 'Алексей',
    meta: '41 год',
    result: '−12 кг и режим',
    text: 'Работа в смену сбила режим полностью. Я ел когда попало, не спал, чувствовал себя выжатым. Трекер привычек и дневник в ЛВС помогли мне вернуть структуру: подъём в 7:00, тренировки через день, ужин до 19:00. За 4 месяца сбросил 12 кг и снова сплю по ночам.',
    photo: '/reviews/alexey.jpg',
  },
  {
    name: 'Ольга',
    meta: '34 года',
    result: '6 месяцев без срывов',
    text: 'С двумя детьми и работой я постоянно жила в режиме «успеть всё». ЛВС дала мне не мотивацию, а спокойную систему: утром две минуты на план, вечером пять — на отметки. Впервые за годы я не бросила начатое через неделю. Уже полгода держу ритм без срывов и без чувства вины.',
    photo: '/reviews/olga.jpg',
  },
  {
    name: 'Дмитрий',
    meta: '38 лет',
    result: '+2 часа глубокой работы',
    text: 'Я думал, что проблема во мне: не хватает силы воли, концентрации, дисциплины. Оказалось, проблема в отсутствии обратной связи. Мини-трекеры показывают, где именно рассыпается день. Через месяц я вернул два часа глубокой работы в день и перестал добирать задачи по ночам.',
    photo: '/reviews/dmitry.jpg',
  },
  {
    name: 'Елена',
    meta: '26 лет',
    result: '21 день ранних подъёмов',
    text: 'Раньше я ставила будильник на 6:00 и каждое утро его откладывала. В марафоне по сну нашлась причина: я просто поздно ложилась. Куратор помог перестроить вечер, и подъём перестал быть подвигом. Теперь 21 день встаю в шесть и успеваю позавтракать без спешки.',
    photo: '/reviews/elena.jpg',
  },
  {
    name: 'Сергей',
    meta: '47 лет',
    result: 'Сон 7,5 часа',
    text: 'В моём возрасте уже нельзя жить на кофе и пяти часах сна. База знаний ЛВС дала понятные правила гигиены сна, а дневник — возможность увидеть, что именно мешает. За два месяца сон вырос до 7,5 часов. Энергии стало больше, чем в тридцать, и это не преувеличение.',
    photo: '/reviews/sergey.jpg',
  },
  {
    name: 'Анна',
    meta: '29 лет',
    result: '40 тренировок за квартал',
    text: 'Самое сложное для меня — не начать, а не бросить. В закрытом канале я видела, как другие отмечают тренировки, и не хотелось выпадать из общего ритма. За квартал — 40 тренировок. Это не про силу воли, это про среду, в которой возвращаться легче, чем сдаваться.',
    photo: '/reviews/anna.jpg',
  },
  {
    name: 'Иван',
    meta: '27 лет',
    result: 'Первый марафон до конца',
    text: 'Я записывался на курсы и бросал на второй неделе. В марафоне ЛВС всё иначе: короткие задания, отчёт в общий чат и живой куратор, который замечает, если ты пропал. Впервые дошёл до конца — и не потому, что стало проще, а потому что не остался один.',
    photo: '/reviews/ivan.jpg',
  },
  {
    name: 'Наталья',
    meta: '25 лет',
    result: '3 месяца дневника',
    text: 'Я пришла за трекером, а осталась из-за дневника. Каждый вечер короткая запись: что получилось, что мешало, за что я себе благодарна. Через три месяца заметила, что тревожных мыслей стало меньше, а решений — больше. Это не магия, это привычка смотреть на свою жизнь честно.',
    photo: '/reviews/natalia.jpg',
  },
];

export function Reviews() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const go = (delta: number) => {
    playSound('soft');
    setDirection(delta);
    setIndex((value) => (value + delta + REVIEWS.length) % REVIEWS.length);
  };

  const review = REVIEWS[index];

  return (
    <section id="reviews" className="container-x scroll-mt-24 py-10 md:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="eyebrow"
        >
          <span className="eyebrow-dot" />
          Отзывы
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.06 }}
          className="section-title mt-6"
        >
          Люди становятся лучше
        </motion.h2>
      </div>

      <div className="relative mx-auto mt-10 max-w-4xl">
        <div className="card relative overflow-hidden p-6 sm:p-9">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl"
          />
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={review.name}
              custom={direction}
              initial={{ opacity: 0, x: direction * 36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -36 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) go(1);
                else if (info.offset.x > 60) go(-1);
              }}
              className="grid cursor-grab gap-7 active:cursor-grabbing md:grid-cols-[168px_1fr] md:items-start md:gap-9"
            >
              <div className="relative mx-auto w-[132px] shrink-0 md:mx-0 md:w-[168px]">
                <img
                  src={review.photo}
                  alt={`${review.name}, ${review.meta}`}
                  loading="lazy"
                  className="aspect-square w-full rounded-[20px] border border-white/10 object-cover grayscale-[0.15]"
                />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-neon/25 bg-black/85 px-3 py-1 font-mono text-[10px] text-neon backdrop-blur">
                  {review.result}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1 text-neon/80" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-[13px] leading-none">
                      ★
                    </span>
                  ))}
                </div>
                <blockquote className="mt-4 text-[14.5px] leading-relaxed text-white/60 sm:text-[15.5px]">
                  «{review.text}»
                </blockquote>
                <div className="mt-6 flex items-center gap-3">
                  <span className="h-px w-6 bg-neon/50" />
                  <p className="text-[13.5px] font-semibold text-white">
                    {review.name}
                    <span className="ml-1.5 font-normal text-white/35">{review.meta}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="numeric text-[11px] text-white/40">
              {String(index + 1).padStart(2, '0')}
              <span className="text-white/15"> / {String(REVIEWS.length).padStart(2, '0')}</span>
            </span>
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Отзывы">
              {REVIEWS.map((item, i) => (
                <button
                  key={item.name}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Отзыв: ${item.name}`}
                  onClick={() => {
                    playSound('soft');
                    setDirection(i > index ? 1 : -1);
                    setIndex(i);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/15 hover:bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-[9.5px] uppercase tracking-[0.16em] text-white/20 sm:block">
              Листайте
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Предыдущий отзыв"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 transition hover:border-white/25 hover:text-white active:scale-[0.98]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Следующий отзыв"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 transition hover:border-white/30 hover:bg-white/[0.07] hover:text-white active:scale-[0.98]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Тарифы
   ============================================================ */

type Plan = {
  name: string;
  price: string;
  caption: string;
  features: string[];
  featured?: boolean;
  cta: string;
};

const PLANS: Plan[] = [
  {
    name: 'Стандарт',
    price: '499',
    caption: 'Закрытое сообщество в Telegram',
    features: ['Закрытый Telegram-канал', 'Общение с участниками', 'Еженедельные разборы прогресса'],
    cta: 'Оформить',
  },
  {
    name: 'Pro',
    price: '990',
    caption: 'Сообщество и личный кабинет',
    features: [
      'Всё из тарифа «Стандарт»',
      'Личный кабинет на сайте',
      'Трекер привычек и планер',
      'Дневник и марафоны',
    ],
    featured: true,
    cta: 'Оформить Pro',
  },
  {
    name: 'Премиум',
    price: '1500',
    caption: 'Полный доступ к экосистеме',
    features: [
      'Всё из тарифа Pro',
      'Расширенные марафоны с куратором',
      'Индивидуальный план развития',
      'Приоритетная поддержка',
    ],
    cta: 'Оформить',
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="container-x scroll-mt-24 py-10 md:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="eyebrow"
        >
          <span className="eyebrow-dot" />
          Тарифы
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.06 }}
          className="section-title mt-6"
        >
          Выберите свой темп роста
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.12 }}
          className="section-subtitle"
        >
          Оплата ежемесячно. Доступ открывается автоматически через Telegram-бота.
        </motion.p>
      </div>

      <div className="mt-10 grid auto-rows-fr items-stretch gap-4 md:grid-cols-3 lg:gap-5">
        {PLANS.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: index * 0.08 }}
            className={`card flex h-full flex-col p-7 sm:p-8 ${
              plan.featured
                ? 'border-white/20 bg-white/[0.035] shadow-[0_0_80px_-40px_rgba(255,255,255,0.45)]'
                : 'card-hover'
            }`}
          >
            {plan.featured && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
              />
            )}

            <div className="flex items-center justify-between">
              <h3 className="font-display text-[15px] font-bold uppercase tracking-[0.18em] text-white/85">
                {plan.name}
              </h3>
              {plan.featured && (
                <span className="rounded-full border border-white/20 bg-white/[0.06] px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/70">
                  Выбор большинства
                </span>
              )}
            </div>

            <div className="mt-6 flex items-baseline gap-2">
              <span className="display text-[42px] leading-none tracking-[-0.05em]">
                {plan.price}
              </span>
              <span className="text-[12px] text-white/35">₽ / месяц</span>
            </div>

            <p className="mt-3 text-[12.5px] leading-relaxed text-white/40">{plan.caption}</p>

            <div className="my-7 divider" />

            <ul className="flex-1 space-y-3.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-full bg-neon/15 text-neon">
                    <Check className="h-2.5 w-2.5" strokeWidth={3.4} />
                  </span>
                  <span className="text-[13px] leading-relaxed text-white/55">{feature}</span>
                </li>
              ))}
            </ul>

            <a
              href="https://t.me/lvs_key_bot"
              target="_blank"
              rel="noopener noreferrer"
              className={`btn mt-7 w-full border !py-3.5 text-[13px] ${
                plan.featured
                  ? 'border-white/30 bg-white/[0.08] text-white hover:border-white/50 hover:bg-white/[0.12] hover:shadow-[0_0_36px_-12px_rgba(255,255,255,0.4)]'
                  : 'border-white/15 bg-white/[0.03] text-white/85 hover:border-white/30 hover:bg-white/[0.07] hover:text-white'
              }`}
            >
              {plan.cta}
              <ArrowUpRight className="h-3.5 w-3.5 opacity-50" />
            </a>
          </motion.div>
        ))}
      </div>

      <p className="mt-8 text-center text-[11.5px] text-white/25">
        Отменить подписку можно в любой момент в Telegram-боте.
      </p>
    </section>
  );
}

/* ============================================================
   FAQ
   ============================================================ */

const FAQ = [
  {
    q: 'У меня нет силы воли, постоянно всё бросаю. ЛВС поможет?',
    a: 'ЛВС — это не просто трекер. Это система. Здесь нет токсичного чувства вины за пропущенные дни (для этого есть заморозки). Мы даем вам не только инструменты, но и Базу знаний, и закрытое сообщество, где вы не останетесь один на один с прокрастинацией.',
  },
  {
    q: 'В чём смысл марафонов и кураторства?',
    a: 'Одному двигаться сложно. Марафоны — это групповые челленджи под руководством куратора. Вы выполняете задания, делитесь результатами в общем чате и получаете поддержку от единомышленников. Это создает внешнюю опору, пока внутренняя дисциплина еще не окрепла.',
  },
  {
    q: 'Что именно входит в Базу знаний?',
    a: 'Это концентрат полезных материалов: от настройки качественного сна и питания до методик вроде «12 недель в году». Мы даем проверенную информацию, которая помогает выстроить жизнь без выгорания.',
  },
  {
    q: 'Сколько времени это займет в день? У меня плотный график',
    a: 'Система создана для занятых людей. Утром вы тратите 2 минуты на то, чтобы посмотреть план, а вечером — 5 минут, чтобы отметить выполненные привычки и зафиксировать настроение в дневнике. Дисциплина экономит время, а не тратит его.',
  },
  {
    q: 'В чём реальная разница между тарифами?',
    a: 'Стандарт — это база для чтения в Telegram. Pro дает доступ к сайту, трекерам и базовым марафонам. Premium открывает абсолютно всё, включая полную Базу знаний, индивидуальный план и премиум-марафоны.',
  },
  {
    q: 'Если я пропущу день, всё сгорит?',
    a: 'Нет. В системе есть заморозки, которые сохраняют вашу серию. Главное правило ЛВС — не идеальность, а регулярное возвращение в ритм.',
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="container-x scroll-mt-24 py-10 md:py-20">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="eyebrow"
          >
            <span className="eyebrow-dot" />
            FAQ
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.06 }}
            className="section-title mt-5 text-[28px] sm:text-[36px]"
          >
            Вопросы, которые<br className="hidden sm:block" /> обычно остаются за кадром
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="mt-4 max-w-[360px] text-[13.5px] leading-relaxed text-white/45"
          >
            Коротко о том, как устроена система и что именно вы получаете вместе с доступом.
          </motion.p>
          <motion.a
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            href="https://t.me/lvs_key_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-[12.5px] text-white/45 transition hover:text-white"
          >
            Задать свой вопрос в Telegram
            <ArrowUpRight className="h-3.5 w-3.5" />
          </motion.a>
        </div>

        <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {FAQ.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    playSound('soft');
                    setOpenIndex(isOpen ? null : index);
                  }}
                  aria-expanded={isOpen}
                  className="group flex w-full items-start gap-4 py-5 text-left"
                >
                  <span className="mt-[3px] font-mono text-[10px] tracking-[0.16em] text-white/20">
                    0{index + 1}
                  </span>
                  <span className="flex-1 font-display text-[14.5px] font-semibold leading-snug text-white/85 transition group-hover:text-white sm:text-[15.5px]">
                    {item.q}
                  </span>
                  <span
                    className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-all duration-300 ${
                      isOpen
                        ? 'rotate-180 border-white/30 text-white'
                        : 'border-white/10 text-white/30 group-hover:border-white/25 group-hover:text-white/70'
                    }`}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 pl-[30px] pr-8 text-[12.5px] leading-relaxed text-white/50 sm:text-[13px]">
                        {item.a}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Подвал
   ============================================================ */

function SoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(soundAllowed());
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    try {
      window.localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    } catch {
      /* приватный режим */
    }
    if (next) playSound('soft');
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-white/40 transition hover:border-white/25 hover:text-white/70 active:scale-[0.98]"
    >
      {enabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
      Звуки {enabled ? 'вкл' : 'выкл'}
    </button>
  );
}

export function Footer() {
  return (
    <footer className="mt-8 border-t border-white/[0.07] bg-black/40">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5" aria-label="ЛВС — на главную">
              <span className="font-display text-[16px] font-extrabold uppercase leading-none tracking-[0.38em] text-white">
                ЛВС
              </span>
              <span className="h-1 w-1 rounded-full bg-neon shadow-[0_0_10px_rgba(0,229,143,0.9)]" />
            </Link>
            <p className="mt-4 max-w-[240px] text-[12.5px] leading-relaxed text-white/35">
              Лучшая Версия Себя — система, которая считает дни за тебя.
            </p>
            <div className="mt-5">
              <SoundToggle />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Продукт
            </p>
            <ul className="mt-4 space-y-2.5 text-[12.5px] text-white/50">
              <li>
                <a href="#potential" className="transition hover:text-white">
                  Возможности
                </a>
              </li>
              <li>
                <a href="#pricing" className="transition hover:text-white">
                  Тарифы
                </a>
              </li>
              <li>
                <a href="#reviews" className="transition hover:text-white">
                  Отзывы
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Документы
            </p>
            <ul className="mt-4 space-y-2.5 text-[12.5px] text-white/50">
              <li>
                <Link href="/terms" className="transition hover:text-white">
                  Пользовательское соглашение
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition hover:text-white">
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="transition hover:text-white">
                  Контакты
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Связь
            </p>
            <ul className="mt-4 space-y-3 text-[12.5px] text-white/50">
              <li>
                <a
                  href="mailto:hello@lvs.ru"
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  hello@lvs.ru
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/lvs_key_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  <TelegramIcon className="h-3.5 w-3.5 text-white/40" />
                  @lvs_key_bot
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-[11px] text-white/25 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ЛВС. Все права защищены.</p>
          <p className="flex items-center gap-1.5">
            Сделано для тех, кто выбирает себя
            <span className="h-1 w-1 rounded-full bg-neon/70" />
          </p>
        </div>
      </div>
    </footer>
  );
}
