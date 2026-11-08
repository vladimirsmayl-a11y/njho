'use client';

import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileCheck2,
  FileText,
  Fingerprint,
  Globe2,
  Headphones,
  Loader2,
  Lock,
  Mail,
  Menu,
  ScrollText,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { TelegramIcon } from './icons';
import { useAuth } from './auth-provider';
import { AppWindowShowcase, IPhoneShowcase } from './iphone-showcase';
import { api, body, errorText, isNetworkError } from '@/lib/api';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger, useGSAP);

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
      <div className="landing-root">{children}</div>
      <RevealEngine />

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
              className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-md"
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

              <p className="mt-5 text-center text-[10.5px] leading-relaxed text-white/25">
                Продолжая, вы принимаете оферту и политику обработки данных.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthModalContext.Provider>
  );
}

/* ============================================================
   Появление секций при прокрутке (GSAP ScrollTrigger)
   ============================================================ */

function RevealEngine() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const items = gsap.utils.toArray<HTMLElement>('[data-reveal]');
      items.forEach((el) => {
        gsap.from(el, {
          y: 26,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            once: true,
          },
        });
      });
    });
    return () => mm.revert();
  });

  return null;
}

/* ============================================================
   Шапка
   ============================================================ */

const NAV = [
  { href: '#potential', label: 'Возможности' },
  { href: '#about', label: 'Система' },
  { href: '#pricing', label: 'Тарифы' },
  { href: '#reviews', label: 'Отзывы' },
  { href: '#faq', label: 'Вопросы' },
];

export function Header() {
  const auth = useAuthModal();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.25 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
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
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled || open
          ? 'border-b border-line bg-[#0B0B0C]/95 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <motion.div
        aria-hidden
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-[1.5px] origin-left bg-acid"
      />
      <div className="lp-container flex h-[72px] items-center justify-between">
        <Link href="/" aria-label="ЛВС — на главную" className="group flex items-center gap-2.5">
          <span className="font-heading text-[17px] font-semibold uppercase leading-none tracking-[0.2em] text-paper">
            ЛВС
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-acid transition-transform duration-500 group-hover:scale-125" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Разделы страницы">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[13.5px] font-medium text-paper/55 transition-colors hover:text-paper"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={auth.open}
            className="hidden text-[13.5px] font-medium text-paper/55 transition hover:text-paper sm:inline-flex"
          >
            Войти
          </button>
          <a
            href="#pricing"
            className="lp-btn lp-btn-acid hidden !px-4 !py-2.5 !text-[13px] sm:inline-flex"
          >
            Начать
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
          <a
            href="#pricing"
            onClick={() => playSound('soft')}
            className="lp-btn lp-btn-acid !px-3.5 !py-2.5 !text-[12.5px] sm:hidden"
          >
            Начать
          </a>
          <button
            type="button"
            onClick={() => {
              playSound('soft');
              setOpen((v) => !v);
            }}
            aria-expanded={open}
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            className="grid h-10 w-10 place-items-center rounded-full border border-paper/15 text-paper/80 transition hover:border-paper/40 hover:bg-paper/5 active:scale-[0.98] md:hidden"
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
            className="overflow-hidden border-t border-line bg-[#0B0B0C]/95 backdrop-blur-xl md:hidden"
          >
            <nav className="lp-container flex flex-col py-4" aria-label="Мобильное меню">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-line/60 py-4 font-heading text-[18px] font-medium uppercase tracking-[0.06em] text-paper/80 transition hover:text-acid"
                >
                  {item.label}
                </a>
              ))}
              <a
                href="#pricing"
                onClick={() => {
                  setOpen(false);
                  playSound('soft');
                }}
                className="lp-btn lp-btn-acid mt-5 w-full"
              >
                Начать сегодня
                <ArrowRight className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  auth.open();
                }}
                className="lp-btn lp-btn-ghost mt-3 w-full"
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

const HERO_STATS = [
  { value: '194', label: 'статьи в базе' },
  { value: '9', label: 'направлений' },
  { value: '24/7', label: 'доступ' },
];

export function Hero() {
  const auth = useAuthModal();
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const q = gsap.utils.selector(root);
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        tl.from(q('[data-hero-line]'), {
          yPercent: 118,
          duration: 1.15,
          stagger: 0.09,
          delay: 0.1,
        })
          .from(
            q('[data-hero-fade]'),
            { y: 20, opacity: 0, duration: 0.85, stagger: 0.09 },
            0.35,
          )
          .from(
            q('[data-hero-stat]'),
            { y: 16, opacity: 0, duration: 0.7, stagger: 0.08 },
            0.62,
          );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="lp-hero-bg relative overflow-hidden pb-8 pt-8 sm:pb-14 lg:pb-16 lg:pt-10"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[620px] lp-grid" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0B0B0C] to-transparent" />
      </div>

      <div className="lp-container relative">
        <div className="grid items-center gap-12 pt-6 sm:pt-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-6 lg:pt-10">
          <div className="relative z-10">
            <p data-hero-fade className="lp-label">
              Система дисциплины
            </p>

            <h1 className="lp-h1 mt-5 sm:mt-6">
              <span className="block overflow-hidden pb-[0.08em]">
                <span data-hero-line className="block whitespace-nowrap">
                  Дисциплина —
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.08em]">
                <span data-hero-line className="block whitespace-nowrap">
                  это <span className="lp-mark">свобода.</span>
                </span>
              </span>
            </h1>

            <p
              data-hero-fade
              className="mt-6 max-w-[490px] text-[15.5px] leading-[1.7] text-ash sm:mt-7 sm:text-[16.5px]"
            >
              Не мотивация и не очередной курс. Система, которая держит ритм,
              когда желание пропало. Две минуты утром, пять вечером — и день
              перестаёт рассыпаться.
            </p>

            <div data-hero-fade className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="#pricing" className="lp-btn lp-btn-acid w-full sm:w-auto">
                Начать сегодня
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <a href="#potential" className="lp-btn lp-btn-ghost w-full sm:w-auto">
                Как это работает
              </a>
            </div>

            <p data-hero-fade className="mt-3 text-[11.5px] text-ash">
              14 дней гарантии · отмена в один клик
            </p>

            <button
              type="button"
              data-hero-fade
              onClick={auth.open}
              className="mt-4 text-[12.5px] font-medium text-paper/50 underline-offset-4 transition hover:text-paper hover:underline"
            >
              Уже в системе? Войти в кабинет
            </button>

            <div data-hero-fade className="mt-8 flex flex-wrap items-center gap-5">
              <div className="flex -space-x-2.5">
                {['kirill', 'maria', 'alexey', 'olga', 'dmitry'].map((name) => (
                  <img
                    key={name}
                    src={`/reviews/${name}.jpg`}
                    alt=""
                    loading="lazy"
                    className="h-9 w-9 rounded-full border-2 border-[#0B0B0C] object-cover grayscale-[0.2]"
                  />
                ))}
                <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#0B0B0C] bg-paper/10 font-heading text-[10px] font-semibold text-paper/70">
                  +2k
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-0.5 text-acid" aria-hidden>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <span key={index} className="text-[11px] leading-none">
                        ★
                      </span>
                    ))}
                  </span>
                  <span className="text-[12.5px] font-semibold text-paper/85">4.9 из 5</span>
                </div>
                <p className="mt-1 text-[11.5px] text-ash">2 400+ участников</p>
              </div>
            </div>

            <div className="mt-9 grid max-w-[520px] grid-cols-3 border-y border-line">
              {HERO_STATS.map((item) => (
                <div
                  key={item.label}
                  data-hero-stat
                  className="px-4 py-4 first:pl-0 last:pr-0 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line"
                >
                  <p className="lp-display text-[30px] leading-none sm:text-[34px]">{item.value}</p>
                  <p className="mt-2 text-[10.5px] font-medium tracking-[0.01em] text-ash">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <IPhoneShowcase />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Бегущая строка
   ============================================================ */

const TICKER = [
  'Планер',
  'Мини-трекеры',
  'Марафоны',
  'Дневник',
  'База знаний',
  'Сообщество',
  'Заморозки',
  'Статистика',
  '14 дней гарантии',
  '2 400+ участников',
];

export function Ticker() {
  return (
    <div className="lp-ticker" aria-hidden>
      <div className="lp-marquee">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {TICKER.map((item) => (
              <span
                key={`${copy}-${item}`}
                className="flex items-center gap-8 px-7 font-heading text-[12.5px] font-medium uppercase tracking-[0.08em] text-paper/50"
              >
                {item}
                <span className="text-acid/80">✳</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Узнаёшь себя?
   ============================================================ */

const PAINS = [
  {
    title: 'Понедельник — новая жизнь',
    text: 'К среде запал кончается, к пятнице приходит вина. И так по кругу.',
  },
  {
    title: 'Ждёшь, когда захочется',
    text: 'Мотивация не приходит по расписанию. Поэтому важное стоит на месте.',
  },
  {
    title: 'Всё держится в голове',
    text: 'Задачи, привычки, обещания себе. Что-то обязательно теряется.',
  },
  {
    title: 'Ты один против всех',
    text: 'Нет людей рядом, которые заметят, если ты пропал на неделю.',
  },
];

export function Pain() {
  return (
    <section id="pain" className="lp-section border-t border-line">
      <div className="lp-container">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div data-reveal>
            <p className="lp-label">Знакомо?</p>
            <h2 className="lp-h2 mt-5">
              Ты не ленивый.
              <br />
              Ты <span className="lp-mark">без системы.</span>
            </h2>
            <p className="lp-lead mt-6 max-w-[400px]">
              Сила воли — плохой фундамент. Она заканчивается ровно тогда, когда
              нужна больше всего. ЛВС убирает необходимость каждый день
              уговаривать себя начать.
            </p>
          </div>

          <div
            data-reveal
            className="grid gap-px overflow-hidden rounded-[12px] border border-line bg-line sm:grid-cols-2"
          >
            {PAINS.map((item) => (
              <article key={item.title} className="bg-[#0C0C0D] p-5 sm:p-6">
                <h3 className="font-heading text-[17px] font-medium uppercase tracking-[0.01em] text-paper">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-[13px] leading-[1.65] text-ash">{item.text}</p>
              </article>
            ))}
          </div>
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
    title: 'Ежедневный планер',
    text: 'Утром две минуты — и день расписан. Вечером пять — и видно, что ты не слил его.',
  },
  {
    title: 'Мини-трекеры',
    text: 'Вода, сон, ходьба, спорт. Не «когда-нибудь», а сегодня. Без таблиц на полстены.',
  },
  {
    title: 'Марафоны',
    text: 'Группа, дедлайн, отчёт. Не даст бросить на третий день и вернуться к нулю.',
  },
  {
    title: 'Дневник',
    text: 'Вечерний разбор: что сработало, что слить, что повторить завтра.',
  },
];

export function Potential() {
  return (
    <section id="potential" className="lp-section border-t border-line">
      <div className="lp-container grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
        <div data-reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="lp-label">Что внутри</p>
          <h2 className="lp-h2 mt-5">
            Четыре инструмента.
            <br />
            Один <span className="lp-mark">ритм.</span>
          </h2>
          <p className="lp-lead mt-6 max-w-[360px]">
            Не набор разрозненных функций, а связная система. Каждый инструмент
            подхватывает следующий — чтобы не терять импульс и не возвращаться к нулю.
          </p>
          <Link href="/login" className="lp-link mt-8">
            Открыть систему
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="border-t border-line">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              data-reveal
              className="group grid grid-cols-[1fr_auto] items-start gap-4 border-b border-line py-7 sm:gap-6 sm:py-8"
            >
              <div>
                <h3 className="lp-h3 transition-colors duration-300 group-hover:text-acid">
                  {feature.title}
                </h3>
                <p className="mt-2.5 max-w-[520px] text-[14px] leading-[1.7] text-ash sm:text-[15px]">
                  {feature.text}
                </p>
              </div>
              <ArrowUpRight className="mt-1 h-5 w-5 text-paper/20 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-acid" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Гарантия
   ============================================================ */

export function Guarantee() {
  return (
    <section id="guarantee" className="border-y border-acid/25 bg-acid text-[#0A0A0A]">
      <div className="lp-container flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:py-10">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-[#0A0A0A] text-acid">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <p className="font-heading text-[24px] font-semibold uppercase leading-[1.02] sm:text-[30px]">
              14 дней в системе.
              <br /> Не войдёшь в ритм — вернём деньги.
            </p>
            <p className="mt-2 max-w-[560px] text-[12.5px] leading-[1.6] text-[#0A0A0A]/65">
              Без мелкого шрифта и условий-ловушек. Если за две недели не станет
              яснее, как держать ритм, — вернём оплату.
            </p>
          </div>
        </div>
        <a
          href="#pricing"
          className="lp-btn shrink-0 bg-[#0A0A0A] text-acid hover:bg-[#151515]"
        >
          Проверить на себе
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

/* ============================================================
   Экосистема
   ============================================================ */

const ECOSYSTEM = [
  {
    title: 'База знаний',
    text: '194 статьи без воды: сон, питание, фокус, деньги, дисциплина. Читаешь — и сразу применяешь.',
  },
  {
    title: 'Активное сообщество',
    text: '2 400 человек, которые тоже встают и делают. Онлайн и офлайн, без токсичности и мотивационного шума.',
  },
  {
    title: 'Поддержка и кураторство',
    text: 'Живой куратор заметит, если ты пропал, и вернёт в ритм без чувства вины.',
  },
];

export function Ecosystem() {
  return (
    <section id="about" className="lp-section overflow-hidden border-t border-line bg-[#0D0D0E]">
      <div className="lp-container">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-20">
          <div data-reveal>
            <p className="lp-label">Среда</p>
            <h2 className="lp-h2 mt-5">
              Не просто трекер.
              <br />
              Твоя <span className="lp-mark">среда.</span>
            </h2>
            <p className="lp-lead mt-6 max-w-[440px]">
              Инструменты — половина дела. Вторая половина — люди, которые заметят,
              если ты пропал, и знания, которые не дают сойти с дистанции.
            </p>

            <div className="mt-9 border-t border-line">
              {ECOSYSTEM.map((item) => (
                <div
                  key={item.title}
                  data-reveal
                  className="border-b border-line py-5"
                >
                  <h3 className="font-heading text-[14px] font-medium uppercase tracking-[0.06em] text-paper">{item.title}</h3>
                  <p className="mt-1.5 max-w-[440px] text-[13px] leading-[1.7] text-ash">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div data-reveal className="lg:pl-4">
            <AppWindowShowcase />
          </div>
        </div>
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
    <section id="reviews" className="lp-section border-t border-line bg-[#0D0D0E]">
      <div className="lp-container grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <div data-reveal>
          <p className="lp-label">Отзывы</p>
          <h2 className="lp-h2 mt-5">
            Они уже
            <br />
            <span className="lp-mark">в ритме.</span>
          </h2>
          <p className="mt-5 max-w-[300px] text-[13px] leading-[1.65] text-ash">
            Не верь на слово. Вот что изменилось у людей, которые дошли.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex -space-x-2.5">
              {['kirill', 'maria', 'olga', 'anna'].map((name) => (
                <img
                  key={name}
                  src={`/reviews/${name}.jpg`}
                  alt=""
                  loading="lazy"
                  className="h-9 w-9 rounded-full border-2 border-[#0D0D0E] object-cover grayscale-[0.2]"
                />
              ))}
            </div>
            <div>
              <p className="font-heading text-[13px] font-semibold text-paper/85">4.9 из 5</p>
              <p className="mt-1 text-[11.5px] text-ash">2 400+ участников</p>
            </div>
          </div>

          <div className="mt-9 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Предыдущий отзыв"
              className="grid h-11 w-11 place-items-center rounded-[10px] border border-line text-paper/60 transition hover:border-paper/40 hover:text-paper active:scale-[0.98]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Следующий отзыв"
              className="grid h-11 w-11 place-items-center rounded-[10px] border border-line text-paper/60 transition hover:border-paper/40 hover:text-paper active:scale-[0.98]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="ml-2 text-[11.5px] tabular-nums text-ash">
              {String(index + 1).padStart(2, '0')} / {String(REVIEWS.length).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div data-reveal className="relative">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.figure
              key={review.name}
              custom={direction}
              initial={{ opacity: 0, x: direction * 26 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -26 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) go(1);
                else if (info.offset.x > 60) go(-1);
              }}
              className="cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-center gap-4">
                <img
                  src={review.photo}
                  alt={`${review.name}, ${review.meta}`}
                  loading="lazy"
                  className="h-16 w-16 rounded-full border border-line object-cover grayscale-[0.15]"
                />
                <div>
                  <p className="text-[15px] font-semibold text-paper">
                    {review.name}
                    <span className="ml-2 font-normal text-ash">{review.meta}</span>
                  </p>
                  <p className="mt-1.5 text-[11.5px] font-semibold text-acid">
                    {review.result}
                  </p>
                </div>
              </div>

              <blockquote className="lp-quote mt-8">«{review.text}»</blockquote>

              <figcaption className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                <span className="flex items-center gap-1 text-acid" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-[12px] leading-none">
                      ★
                    </span>
                  ))}
                </span>
                <span className="text-[11.5px] text-ash">
                  Проверенный участник
                </span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>

          <div className="mt-9 flex flex-wrap gap-1.5" role="tablist" aria-label="Отзывы">
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
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === index ? 'w-8 bg-acid' : 'w-1.5 bg-paper/20 hover:bg-paper/40',
                )}
              />
            ))}
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
    features: [
      'Закрытый Telegram-канал',
      'Общение с участниками',
      'Еженедельные разборы прогресса',
    ],
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
    <section id="pricing" className="lp-section border-t border-line">
      <div className="lp-container">
        <div
          data-reveal
          className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"
        >
          <div>
            <p className="lp-label">Тарифы</p>
            <h2 className="lp-h2 mt-5">
              Три способа
              <br />
              <span className="lp-mark">войти в ритм.</span>
            </h2>
          </div>
          <p className="max-w-[330px] text-[13px] leading-[1.7] text-ash">
            Оплата ежемесячно. Без скрытых платежей. Отмена — в один клик.
            14 дней гарантии возврата.
          </p>
        </div>

        <div className="mt-12 grid border-t border-line md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              data-reveal
              className={cn(
                'relative flex flex-col border-b border-line py-8 md:border-b-0 md:border-r md:px-8 md:py-10 md:first:pl-0 md:last:border-r-0 md:last:pr-0',
                plan.featured && 'bg-paper/[0.035] md:px-9',
              )}
            >
              {plan.featured ? (
                <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-acid" />
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <h3 className="font-heading text-[14px] font-medium uppercase tracking-[0.08em] text-paper/85">
                  {plan.name}
                </h3>
                {plan.featured ? (
                  <span className="rounded-[6px] border border-acid/35 px-2 py-1 text-[10.5px] font-medium text-acid">
                    Выбор большинства
                  </span>
                ) : null}
              </div>

              <div className="mt-8 flex items-baseline gap-2">
                <span className="lp-display text-[54px] leading-none">{plan.price}</span>
                <span className="text-[12px] text-ash">
                  ₽ / мес
                </span>
              </div>

              <p className="mt-3 text-[12.5px] leading-relaxed text-ash">{plan.caption}</p>

              <ul className="mt-8 flex-1 space-y-3 border-t border-line pt-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-paper/70">
                    <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-acid" strokeWidth={2.6} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="https://t.me/lvs_key_bot"
                target="_blank"
                rel="noopener noreferrer"
                className={cn('lp-btn mt-8 w-full', plan.featured ? 'lp-btn-acid' : 'lp-btn-ghost')}
              >
                {plan.cta}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
              </a>
            </div>
          ))}
        </div>

        <div
          data-reveal
          className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5"
        >
          <div className="flex flex-wrap gap-4 text-[11px] text-ash">
            <span>Visa</span>
            <span>Mastercard</span>
            <span>МИР</span>
            <span>Telegram</span>
          </div>
          <span className="inline-flex items-center gap-2 text-[11px] text-ash">
            <ShieldCheck className="h-3.5 w-3.5 text-acid/70" />
            Безопасная оплата · SSL/TLS
          </span>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FAQ
   ============================================================ */

const FAQ = [
  {
    q: 'У меня нет силы воли, постоянно всё бросаю. ЛВС поможет?',
    a: 'ЛВС не продаёт мотивацию. Это система: план на день, трекеры, марафоны и живой куратор. Когда желание пропадает, работают расписание и люди рядом. Пропущенный день не сжигает серию — для этого есть заморозки.',
  },
  {
    q: 'Это очередная мотивация, которая выветрится через неделю?',
    a: 'Нет. Мы не обещаем, что ты будешь хотеть каждый день. Мы делаем так, чтобы результат не зависел от настроения: короткие действия, видимый прогресс и среда, которая замечает твои пропуски.',
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
  {
    q: 'Вы реально вернёте деньги, если не подойдёт?',
    a: 'Да. Даём 14 дней, чтобы попробовать систему без риска. Если за это время не станет яснее, как держать ритм, — напишите в поддержку, и мы вернём оплату.',
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="lp-section border-t border-line">
      <div className="lp-container grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <div data-reveal>
          <p className="lp-label">Вопросы</p>
          <h2 className="lp-h2 mt-5">
            Без воды
            <br />
            и <span className="lp-mark">по делу.</span>
          </h2>
          <p className="lp-lead mt-6 max-w-[340px]">
            Коротко о том, как устроена система, сколько времени она забирает
            и что будет, если пропустить день.
          </p>
          <a
            href="https://t.me/lvs_key_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-link mt-8"
          >
            Задать свой вопрос
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="border-t border-line">
          {FAQ.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.q} data-reveal className="border-b border-line">
                <button
                  type="button"
                  onClick={() => {
                    playSound('soft');
                    setOpenIndex(isOpen ? null : index);
                  }}
                  aria-expanded={isOpen}
                  className="group flex w-full items-start gap-4 py-5 text-left sm:gap-5 sm:py-6"
                >
                  <span className="flex-1 text-[15.5px] font-semibold leading-snug text-paper/85 transition group-hover:text-paper sm:text-[17px]">
                    {item.q}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-all duration-300',
                      isOpen
                        ? 'rotate-180 border-acid/50 text-acid'
                        : 'border-paper/15 text-paper/35 group-hover:border-paper/40 group-hover:text-paper/70',
                    )}
                  >
                    <ChevronDown className="h-4 w-4" />
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
                      <p className="pb-6 pr-8 text-[13.5px] leading-[1.75] text-ash sm:text-[14.5px]">
                        {item.a}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Документы и доверие · в самом низу
   ============================================================ */

const DOCUMENTS = [
  {
    icon: FileText,
    badge: 'Оферта',
    title: 'Публичная оферта',
    text: 'Условия доступа, тарифы и порядок оплаты.',
    href: '/terms',
    tag: 'Онлайн',
  },
  {
    icon: ShieldCheck,
    badge: 'Приватность',
    title: 'Политика конфиденциальности',
    text: 'Какие данные мы собираем и как их защищаем.',
    href: '/privacy',
    tag: 'Редакция 2026',
  },
  {
    icon: ScrollText,
    badge: 'Правила',
    title: 'Пользовательское соглашение',
    text: 'Правила использования платформы и аккаунта.',
    href: '/terms',
    tag: 'Онлайн',
  },
  {
    icon: Fingerprint,
    badge: 'Согласие',
    title: 'Обработка данных',
    text: 'Согласие на обработку персональных данных.',
    href: '/privacy',
    tag: 'Конфиденциально',
  },
  {
    icon: Building2,
    badge: 'Реквизиты',
    title: 'Юридические реквизиты',
    text: 'Данные организации и договорные условия.',
    href: '/contacts',
    tag: 'По запросу',
  },
  {
    icon: Headphones,
    badge: 'Поддержка',
    title: 'Поддержка 24/7',
    text: 'Ответим в течение рабочего дня в Telegram.',
    href: '/contacts',
    tag: '≈ 15 мин',
  },
];

export function Trust() {
  return (
    <section id="trust" className="lp-section border-t border-line">
      <div className="lp-container">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div data-reveal>
            <p className="lp-label">Документы</p>
            <h2 className="lp-h2 mt-5 text-[32px] sm:text-[42px]">
              Всё <span className="lp-mark">официально.</span>
            </h2>
            <p className="mt-5 max-w-[350px] text-[13.5px] leading-[1.7] text-ash">
              Документы, оплата и защита данных — на виду. Никаких мелких шрифтов
              и скрытых условий: только понятные правила.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {['Visa', 'Mastercard', 'МИР', 'Telegram'].map((method) => (
                <span
                  key={method}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-line px-2.5 py-1.5 text-[10.5px] text-paper/60"
                >
                  <CreditCard className="h-3 w-3 text-paper/30" />
                  {method}
                </span>
              ))}
            </div>

            <div className="mt-6 space-y-2.5 border-t border-line pt-5 text-[11px] text-ash">
              <p className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-acid/70" /> SSL/TLS · данные зашифрованы
              </p>
              <p className="flex items-center gap-2">
                <Globe2 className="h-3.5 w-3.5 text-acid/70" /> Работаем в Казахстане и России
              </p>
              <p className="flex items-center gap-2">
                <BadgeCheck className="h-3.5 w-3.5 text-acid/70" /> Договор оферты · закрывающие
                документы
              </p>
            </div>
          </div>

          <div data-reveal className="grid border-t border-line sm:grid-cols-2">
            {DOCUMENTS.map((doc) => {
              const Icon = doc.icon;
              return (
                <a
                  key={doc.title}
                  href={doc.href}
                  className="group flex flex-col border-b border-line p-5 transition-colors hover:bg-paper/[0.03] sm:odd:border-r sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-[6px] border border-line text-paper/50 transition-colors group-hover:border-acid/40 group-hover:text-acid">
                      <Icon className="h-4 w-4" strokeWidth={1.7} />
                    </span>
                    <span className="text-[10.5px] text-ash">
                      {doc.badge}
                    </span>
                  </div>
                  <p className="mt-4 font-heading text-[15px] font-medium uppercase leading-[1.15] tracking-[0.02em] text-paper/90">
                    {doc.title}
                  </p>
                  <p className="mt-2 flex-1 text-[11.5px] leading-[1.6] text-ash">{doc.text}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                    <span className="text-[10.5px] text-ash/70">
                      {doc.tag}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-paper/45 transition-colors group-hover:text-acid">
                      Открыть <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        <div
          data-reveal
          className="mt-8 flex flex-col gap-3 border-t border-line pt-5 text-[11px] text-ash/75 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-center gap-2">
            <FileCheck2 className="h-3.5 w-3.5" />
            Все документы доступны без регистрации
          </p>
          <p className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            Платежи проходят через защищённый шлюз
          </p>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Финальный призыв
   ============================================================ */

export function FinalCta() {
  return (
    <section id="start" className="border-t border-line bg-[#0D0D0E]">
      <div className="lp-container py-14 sm:py-20">
        <div className="relative overflow-hidden rounded-[16px] border border-acid/25 bg-[#101210] px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-acid/[0.08] blur-3xl"
          />
          <div className="relative max-w-[760px]">
            <p className="lp-label">Без отсрочек</p>
            <h2 className="lp-h2 mt-5">
              Идеальный момент
              <br />
              <span className="lp-mark">не наступит.</span>
            </h2>
            <p className="lp-lead mt-5 max-w-[520px]">
              Следующий понедельник будет таким же, как этот. Начни с двух минут
              сегодня — и через 30 дней увидишь серию, а не список обещаний.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="#pricing" className="lp-btn lp-btn-acid w-full sm:w-auto">
                Начать сегодня
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <span className="text-[11.5px] text-ash">
                14 дней гарантии · отмена в один клик
              </span>
            </div>
          </div>
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
      className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[11px] text-paper/45 transition hover:border-paper/30 hover:text-paper/70 active:scale-[0.98]"
    >
      {enabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
      Звуки {enabled ? 'вкл' : 'выкл'}
    </button>
  );
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-line bg-[#08080A]">
      <div className="lp-container relative py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.9fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5" aria-label="ЛВС — на главную">
              <span className="font-heading text-[17px] font-semibold uppercase leading-none tracking-[0.2em] text-paper">
                ЛВС
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-acid" />
            </Link>
            <p className="mt-4 max-w-[260px] text-[12.5px] leading-[1.7] text-ash">
              Лучшая Версия Себя — образовательная платформа, которая помогает
              держать ритм и считать дни за вас.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[10px] text-paper/45">
                <BadgeCheck className="h-3 w-3 text-acid/60" /> Официальный сервис
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[10px] text-paper/45">
                <Globe2 className="h-3 w-3 text-paper/30" /> KZ · RU
              </span>
            </div>
            <div className="mt-5">
              <SoundToggle />
            </div>
          </div>

          <div>
            <p className="font-heading text-[12px] font-medium uppercase tracking-[0.12em] text-paper/70">
              Продукт
            </p>
            <ul className="mt-4 space-y-2.5 text-[12.5px] text-paper/55">
              {[
                { href: '#potential', label: 'Возможности' },
                { href: '#about', label: 'Система' },
                { href: '#pricing', label: 'Тарифы' },
                { href: '#reviews', label: 'Отзывы' },
                { href: '#faq', label: 'Вопросы' },
              ].map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="transition hover:text-paper">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-heading text-[12px] font-medium uppercase tracking-[0.12em] text-paper/70">
              Документы
            </p>
            <ul className="mt-4 space-y-2.5 text-[12px] text-paper/55">
              {[
                { href: '/terms', label: 'Публичная оферта', icon: FileText },
                { href: '/terms', label: 'Пользовательское соглашение', icon: ScrollText },
                { href: '/privacy', label: 'Политика конфиденциальности', icon: ShieldCheck },
                { href: '/privacy', label: 'Согласие на обработку', icon: Fingerprint },
                { href: '/contacts', label: 'Реквизиты и контакты', icon: Building2 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="group inline-flex items-start gap-2 transition hover:text-paper"
                    >
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-paper/25 transition group-hover:text-acid/70" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="font-heading text-[12px] font-medium uppercase tracking-[0.12em] text-paper/70">
              Связь
            </p>
            <ul className="mt-4 space-y-3 text-[12.5px] text-paper/55">
              <li>
                <a
                  href="mailto:hello@lvs.ru"
                  className="inline-flex items-center gap-2 transition hover:text-paper"
                >
                  <Mail className="h-3.5 w-3.5 text-paper/30" />
                  hello@lvs.ru
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/lvs_key_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 transition hover:text-paper"
                >
                  <TelegramIcon className="h-3.5 w-3.5 text-paper/40" />
                  @lvs_key_bot
                </a>
              </li>
              <li>
                <Link href="/contacts" className="inline-flex items-center gap-2 transition hover:text-paper">
                  <Headphones className="h-3.5 w-3.5 text-paper/30" />
                  Поддержка 24/7
                </Link>
              </li>
            </ul>
            <div className="mt-5 rounded-[6px] border border-line bg-paper/[0.02] p-3">
              <p className="text-[10.5px] text-paper/35">
                Юридическое лицо
              </p>
              <p className="mt-1.5 text-[11px] leading-[1.6] text-paper/45">
                ЛВС · образовательная платформа. Реквизиты и договор — в разделе
                «Контакты».
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-line pt-5">
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Публичная оферта', href: '/terms' },
              { label: 'Политика конфиденциальности', href: '/privacy' },
              { label: 'Согласие на обработку', href: '/privacy' },
              { label: 'Реквизиты', href: '/contacts' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full border border-line px-2.5 py-1 text-[10.5px] text-paper/40 transition hover:border-paper/25 hover:text-paper/70"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 text-[11px] text-paper/35 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} ЛВС. Все права защищены.</p>
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" /> SSL/TLS
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CreditCard className="h-3 w-3" /> Visa · Mastercard · МИР
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Безопасная оплата
              </span>
            </div>
          </div>
        </div>

        <div className="pointer-events-none mt-10 select-none">
          <span className="lp-display block text-center text-[clamp(96px,22vw,280px)] leading-[0.86] tracking-[-0.04em] text-paper/[0.055]">
            ЛВС
          </span>
        </div>

        <p className="mt-8 border-t border-line pt-5 text-[10.5px] leading-[1.7] text-paper/25">
          Используя сайт, вы соглашаетесь с публичной офертой и политикой обработки
          персональных данных. Сервис не является медицинской или психотерапевтической
          организацией и не заменяет консультацию специалиста.
        </p>
      </div>
    </footer>
  );
}
