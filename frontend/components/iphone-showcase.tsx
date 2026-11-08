'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BatteryFull,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Flame,
  Gauge,
  GraduationCap,
  Home,
  Search,
  Settings,
  Signal,
  Snowflake,
  Trophy,
  UserRound,
  Users,
  Wifi,
} from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ============================================================
   iPhone 18 Pro · витрина продукта
   Экран собран в реальном масштабе: минимум 10 px, без микрошрифта.
   ============================================================ */

const APP_MENU = [
  { icon: Home, label: 'Дашборд', hint: 'Сегодня', active: true },
  { icon: Activity, label: 'Система', hint: 'Трекеры' },
  { icon: Clock, label: 'Квартал', hint: '12 недель' },
  { icon: Gauge, label: 'Темп дня', hint: '8.6 / 10' },
  { icon: BookOpen, label: 'Дневник', hint: 'Вечер' },
  { icon: Trophy, label: 'Марафоны', hint: '3 активных' },
  { icon: GraduationCap, label: 'База знаний', hint: '194 статьи' },
  { icon: Users, label: 'Друзья', hint: '2 400+' },
  { icon: BarChart3, label: 'Статистика', hint: 'Прогресс' },
  { icon: Settings, label: 'Настройки', hint: 'Профиль' },
];

function StatusBar() {
  return (
    <div className="relative z-20 flex items-center justify-between px-6 pt-3.5 text-[10px] font-semibold text-white/85">
      <span className="numeric tracking-wide">9:41</span>
      <div className="flex items-center gap-1.5">
        <Signal className="h-3 w-3" strokeWidth={2.4} />
        <Wifi className="h-3 w-3" strokeWidth={2.4} />
        <BatteryFull className="h-3.5 w-3.5" strokeWidth={2} />
      </div>
    </div>
  );
}

function LvsScreen() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#0B0B0C]">
      {/* мягкий свет, без неоновых пятен */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 55% at 85% -5%, rgba(237,231,218,0.07), transparent 55%)',
        }}
      />

      <StatusBar />

      {/* Dynamic Island */}
      <div className="absolute left-1/2 top-[9px] z-30 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black shadow-[0_1px_0_rgba(255,255,255,0.07)]">
        <span className="absolute right-2.5 top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full bg-[#0c0c10] ring-1 ring-white/[0.06]">
          <span className="absolute left-1/2 top-1/2 h-[2px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1d2c4a]" />
        </span>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col px-4 pb-1 pt-4">
        {/* header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-[13px] font-extrabold uppercase leading-none tracking-[0.32em] text-white">
              ЛВС
            </span>
            <span className="h-[4px] w-[4px] rounded-full bg-[#C7F45B]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="grid h-[25px] w-[25px] place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/55">
              <Search className="h-3 w-3" />
            </span>
            <span className="relative grid h-[25px] w-[25px] place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/55">
              <Bell className="h-3 w-3" />
              <span className="absolute right-1 top-1 h-[4px] w-[4px] rounded-full bg-[#FF6B4A]" />
            </span>
          </div>
        </div>

        {/* profile */}
        <div className="relative mt-2.5 overflow-hidden rounded-[18px] border border-white/[0.09] bg-white/[0.035] p-3">
          <div className="relative flex items-center gap-3">
            <span className="relative h-[44px] w-[44px] shrink-0 rounded-full bg-gradient-to-br from-[#EDE7DA] via-[#B8C99A] to-[#39543A] p-[1.5px]">
              <span className="grid h-full w-full place-items-center rounded-full bg-[#101011] font-display text-[14px] font-bold text-white">
                А
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 h-[12px] w-[12px] rounded-full border-2 border-[#101012] bg-[#C7F45B]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold leading-tight text-white">Александр</p>
              <p className="mt-1 truncate text-[10px] text-white/45">@alexander · в ритме 14 дней</p>
            </div>
            <span className="shrink-0 rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-[#EBCB72]">
              Premium
            </span>
          </div>

          <div className="relative mt-2.5 grid grid-cols-3 gap-2">
            {[
              { value: '14', label: 'серия', accent: 'text-[#FF8A70]' },
              { value: '92%', label: 'день', accent: 'text-white' },
              { value: '3', label: 'заморозки', accent: 'text-[#A9D9FF]' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[10px] border border-white/[0.06] bg-black/25 px-2 py-2 text-center"
              >
                <p className={cn('numeric font-display text-[17px] font-extrabold leading-none', item.accent)}>
                  {item.value}
                </p>
                <p className="mt-1.5 text-[8px] uppercase tracking-[0.12em] text-white/35">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* streak banner */}
        <div className="mt-2 flex items-center gap-2.5 rounded-[13px] border border-[#FF6B4A]/20 bg-[#FF6B4A]/[0.06] px-3 py-1.5">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#FF6B4A]/15 text-[#FF9C84]">
            <Flame className="h-3.5 w-3.5" fill="currentColor" strokeWidth={1.4} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-white/90">День 14 закрыт</p>
            <p className="text-[9px] text-white/40">Огонёк горит · рекорд 32 дня</p>
          </div>
          <Check className="h-4 w-4 text-[#C7F45B]" strokeWidth={3} />
        </div>

        {/* today goal */}
        <div className="mt-2 rounded-[13px] border border-white/[0.07] bg-white/[0.025] px-3 py-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium text-white/65">Цель дня</p>
            <p className="numeric text-[10px] text-white/40">9 из 10</p>
          </div>
          <div className="mt-2 h-[4px] overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-full w-[92%] rounded-full bg-[#C7F45B]" />
          </div>
        </div>

        {/* menu */}
        <div className="mt-2.5 flex items-center justify-between px-0.5">
          <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-white/35">Меню системы</p>
          <p className="text-[8px] text-white/25">10 разделов</p>
        </div>

        <div className="mt-1 min-h-0 flex-1 space-y-[2px] overflow-hidden">
          {APP_MENU.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={cn(
                  'flex h-[27px] items-center gap-2.5 rounded-[9px] border px-2.5',
                  item.active
                    ? 'border-[#C7F45B]/25 bg-[#C7F45B]/[0.07]'
                    : 'border-white/[0.045] bg-white/[0.022]',
                )}
              >
                <span
                  className={cn(
                    'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px]',
                    item.active ? 'bg-[#C7F45B]/15 text-[#D9FF8A]' : 'bg-white/[0.05] text-white/50',
                  )}
                >
                  <Icon className="h-3 w-3" strokeWidth={1.8} />
                </span>
                <span
                  className={cn(
                    'flex-1 truncate text-[11px] font-medium',
                    item.active ? 'text-white' : 'text-white/75',
                  )}
                >
                  {item.label}
                </span>
                <span className="truncate text-[9px] text-white/30">{item.hint}</span>
                <ChevronRight className="h-3 w-3 shrink-0 text-white/25" />
              </div>
            );
          })}
        </div>
      </div>

      {/* bottom tabs */}
      <div className="relative z-20 mt-1 border-t border-white/[0.07] bg-[#0A0A0B]/95 px-4 pb-1.5 pt-1.5 backdrop-blur-xl">
        <div className="flex items-end justify-between">
          {[
            { icon: Home, label: 'Главная', active: true },
            { icon: Activity, label: 'Трекер' },
            { icon: Trophy, label: 'Марафоны' },
            { icon: UserRound, label: 'Профиль' },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <div key={tab.label} className="flex w-12 flex-col items-center gap-1">
                <Icon
                  className={cn('h-4 w-4', tab.active ? 'text-[#C7F45B]' : 'text-white/35')}
                  strokeWidth={tab.active ? 2.2 : 1.7}
                />
                <span className={cn('text-[8px]', tab.active ? 'text-[#D9FF8A]' : 'text-white/30')}>
                  {tab.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mx-auto mt-1.5 h-[3px] w-20 rounded-full bg-white/25" />
      </div>
    </div>
  );
}

function PhoneFrame() {
  return (
    <div className="relative mx-auto w-[330px] sm:w-[338px] lg:w-[350px]">
      {/* side buttons */}
      <span className="absolute -left-[3px] top-[96px] h-7 w-[3px] rounded-l-[2px] bg-gradient-to-b from-[#6b5f52] to-[#211c18]" />
      <span className="absolute -left-[3px] top-[132px] h-9 w-[3px] rounded-l-[2px] bg-gradient-to-b from-[#62564a] to-[#1c1815]" />
      <span className="absolute -left-[3px] top-[180px] h-9 w-[3px] rounded-l-[2px] bg-gradient-to-b from-[#62564a] to-[#1c1815]" />
      <span className="absolute -right-[3px] top-[150px] h-14 w-[3px] rounded-r-[2px] bg-gradient-to-b from-[#6b5f52] to-[#1c1815]" />
      <span className="absolute -right-[3px] top-[224px] h-9 w-[3px] rounded-r-[2px] bg-gradient-to-b from-[#554a40] to-[#161310]" />

      {/* titanium body */}
      <div
        className="relative aspect-[9/19.35] rounded-[52px] p-[3px] shadow-[0_60px_140px_-40px_rgba(0,0,0,1),0_24px_50px_-22px_rgba(0,0,0,0.9)]"
        style={{
          background:
            'linear-gradient(145deg, #8f8272 0%, #5d5246 7%, #2e2822 22%, #141210 44%, #0f0d0b 55%, #2b251f 72%, #5c5044 88%, #a2947f 100%)',
        }}
      >
        <div className="absolute inset-[1px] rounded-[51px] border border-black/70" />
        <div className="relative h-full w-full overflow-hidden rounded-[49px] bg-black">
          <LvsScreen />

          {/* screen glare */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-40 mix-blend-screen"
            style={{
              background:
                'linear-gradient(118deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 18%, transparent 34%, transparent 72%, rgba(255,255,255,0.04) 88%, transparent 100%)',
            }}
          />
          <div
            aria-hidden
            className="phone-sheen pointer-events-none absolute -left-1/2 top-0 z-40 h-[160%] w-[38%] rotate-[16deg] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent blur-lg"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-40 rounded-[49px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_34px_rgba(0,0,0,0.55)]"
          />
        </div>
      </div>
    </div>
  );
}

export function IPhoneShowcase() {
  const stage = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const quick = useRef<{ x?: (value: number) => void; y?: (value: number) => void }>({});

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const phone = scrollRef.current;
      const tilt = tiltRef.current;
      if (!phone) return;

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.set(phone, { transformPerspective: 1700, transformOrigin: '50% 50%' });

        const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
        intro.fromTo(
          phone,
          {
            opacity: 0,
            yPercent: 10,
            rotationY: -46,
            rotationX: 15,
            rotationZ: -5,
            scale: 0.9,
          },
          {
            opacity: 1,
            yPercent: 0,
            rotationY: -21,
            rotationX: 4,
            rotationZ: 0,
            scale: 1,
            duration: 1.7,
            delay: 0.15,
          },
        );

        if (floatRef.current) {
          gsap.to(floatRef.current, {
            y: -12,
            duration: 4.8,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: 1.9,
          });
        }

        if (tilt) {
          quick.current.x = gsap.quickTo(tilt, 'rotationY', { duration: 0.7, ease: 'power3.out' });
          quick.current.y = gsap.quickTo(tilt, 'rotationX', { duration: 0.7, ease: 'power3.out' });
        }
      });

      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        gsap.to(phone, {
          rotationY: -8,
          rotationX: 0,
          yPercent: -4,
          scale: 0.98,
          ease: 'none',
          scrollTrigger: {
            trigger: stage.current,
            start: 'top 78%',
            end: 'bottom 8%',
            scrub: 1.1,
          },
        });
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(phone, { rotationY: -16, rotationX: 3 });
      });

      return () => mm.revert();
    },
    { scope: stage },
  );

  const onMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = stage.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    quick.current.x?.(-21 + px * 8);
    quick.current.y?.(4 - py * 6);
  };

  const onLeave = () => {
    quick.current.x?.(-21);
    quick.current.y?.(4);
  };

  return (
    <div
      id="iphone-showcase"
      ref={stage}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative mx-auto flex w-full max-w-[600px] items-center justify-center py-4 [perspective:1900px] lg:justify-end lg:py-0"
    >
      {/* спокойная сцена: только мягкая тень от самого корпуса */}
      <div ref={scrollRef} className="relative will-change-transform [transform-style:preserve-3d]">
        <div ref={floatRef} className="relative will-change-transform">
          <div ref={tiltRef} className="relative [transform-style:preserve-3d]">
            <PhoneFrame />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   App window · показываем интерфейс кабинета, а не бота
   ============================================================ */

const WINDOW_MENU = [
  { icon: Home, label: 'Дашборд', active: true },
  { icon: Activity, label: 'Система' },
  { icon: Clock, label: 'Квартал' },
  { icon: Gauge, label: 'Темп дня' },
  { icon: BookOpen, label: 'Дневник' },
  { icon: Trophy, label: 'Марафоны' },
  { icon: GraduationCap, label: 'Знания' },
  { icon: Users, label: 'Друзья' },
];

const WINDOW_TASKS = [
  { title: 'Утренняя тренировка', time: '07:00', done: true },
  { title: 'Глубокая работа · 90 минут', time: '10:00', done: true },
  { title: 'Чтение · 20 страниц', time: '20:30', done: false },
];

export function AppWindowShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="relative overflow-hidden rounded-[16px] border border-paper/[0.14] bg-[#0C0C0D] shadow-[0_70px_150px_-55px_rgba(0,0,0,1)]">
        {/* browser bar */}
        <div className="flex items-center gap-2 border-b border-paper/[0.08] bg-white/[0.025] px-4 py-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
            <span className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
            <span className="h-2 w-2 rounded-full bg-[#28C840]" />
          </span>
          <div className="mx-auto flex w-full max-w-[280px] items-center justify-center gap-1.5 rounded-full border border-paper/[0.08] bg-black/30 px-3 py-1.5 font-mono text-[9px] tracking-[0.08em] text-paper/40">
            <span className="h-1.5 w-1.5 rounded-full bg-acid/70" />
            app.lvs.app/dashboard
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 text-paper/25" />
        </div>

        <div className="grid grid-cols-[96px_1fr] sm:grid-cols-[126px_1fr]">
          {/* sidebar */}
          <div className="border-r border-paper/[0.07] bg-[#0D0D0E] p-3 sm:p-3.5">
            <div className="flex items-center gap-1.5 px-1 pb-3.5 pt-0.5">
              <span className="font-display text-[9px] font-extrabold uppercase tracking-[0.28em] text-paper sm:text-[10px]">
                ЛВС
              </span>
              <span className="h-[3px] w-[3px] rounded-full bg-acid" />
            </div>
            <div className="space-y-[2px]">
              {WINDOW_MENU.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={cn(
                      'flex items-center gap-2 rounded-[6px] px-2 py-[6px]',
                      item.active ? 'bg-white/[0.07] text-paper' : 'text-paper/40',
                    )}
                  >
                    <Icon className="h-3 w-3 shrink-0" strokeWidth={1.8} />
                    <span className="truncate text-[9px] font-medium sm:text-[10px]">{item.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 rounded-[8px] border border-paper/[0.07] bg-white/[0.025] p-2">
              <div className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-[#EDE7DA] to-[#39543A] text-[7px] font-bold text-black">
                  А
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[9px] font-semibold text-paper/85">Александр</p>
                  <p className="text-[8px] text-[#EBCB72]">Premium</p>
                </div>
              </div>
            </div>
          </div>

          {/* main */}
          <div className="relative overflow-hidden p-3.5 sm:p-5">
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-paper/35 sm:text-[9px]">
                  Понедельник, 5 ноября
                </p>
                <p className="mt-1.5 font-display text-[14px] font-bold leading-tight text-paper sm:text-[16px]">
                  Добрый вечер, Александр
                </p>
              </div>
              <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2 py-1 text-[7px] font-bold uppercase tracking-[0.1em] text-[#EBCB72]">
                Premium
              </span>
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-2">
              {[
                { value: '14', label: 'серия', color: 'text-[#FF8A70]' },
                { value: '92%', label: 'день', color: 'text-paper' },
                { value: '3', label: 'заморозки', color: 'text-[#A9D9FF]' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[8px] border border-paper/[0.08] bg-white/[0.025] px-2.5 py-2"
                >
                  <p className={cn('numeric font-display text-[15px] font-extrabold leading-none sm:text-[17px]', item.color)}>
                    {item.value}
                  </p>
                  <p className="mt-1.5 text-[7px] uppercase tracking-[0.1em] text-paper/35 sm:text-[8px]">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="relative mt-3.5 rounded-[10px] border border-paper/[0.08] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-semibold text-paper/80 sm:text-[10px]">Фокус на сегодня</p>
                <p className="numeric text-[8px] text-paper/35">2 / 3</p>
              </div>
              <div className="mt-2.5 space-y-2">
                {WINDOW_TASKS.map((task) => (
                  <div key={task.title} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'grid h-4 w-4 shrink-0 place-items-center rounded-full border',
                        task.done
                          ? 'border-acid bg-acid text-black'
                          : 'border-paper/20 text-transparent',
                      )}
                    >
                      <Check className="h-2 w-2" strokeWidth={3.5} />
                    </span>
                    <span
                      className={cn(
                        'flex-1 truncate text-[9px] sm:text-[10px]',
                        task.done ? 'text-paper/40 line-through' : 'text-paper/80',
                      )}
                    >
                      {task.title}
                    </span>
                    <span className="numeric text-[8px] text-paper/30">{task.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mt-3 flex items-end justify-between gap-2 rounded-[10px] border border-paper/[0.08] bg-white/[0.02] p-3">
              <div>
                <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-paper/35 sm:text-[8px]">Темп недели</p>
                <p className="mt-1 font-display text-[14px] font-bold text-paper">8.6 / 10</p>
              </div>
              <div className="flex h-9 items-end gap-[3px]">
                {[42, 64, 38, 80, 58, 92, 72].map((height, index) => (
                  <span
                    key={index}
                    className="w-[6px] rounded-full bg-gradient-to-t from-acid/30 to-acid"
                    style={{ height: `${height}%`, opacity: 0.55 + index * 0.06 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-6 -right-3 z-10 hidden items-center gap-2 rounded-[10px] border border-paper/[0.12] bg-[#111112]/95 px-3.5 py-2.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,1)] backdrop-blur-xl sm:flex">
        <span className="grid h-8 w-8 place-items-center rounded-[8px] border border-[#A9D9FF]/25 bg-[#A9D9FF]/10 text-[#A9D9FF]">
          <Snowflake className="h-4 w-4" strokeWidth={1.6} />
        </span>
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-paper/40">Заморозки</p>
          <p className="text-[12px] font-semibold leading-tight text-paper">3 в запасе</p>
        </div>
      </div>
    </div>
  );
}
