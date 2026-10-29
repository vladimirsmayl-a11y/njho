'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Copy,
  Crown,
  Flame,
  Gauge,
  Globe,
  GraduationCap,
  Home,
  Link2,
  Loader2,
  Lock,
  LogOut,
  Menu,
  Plus,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  Snowflake,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { cn, plural, tierLabels } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { demoUser } from '@/lib/demo';
import { copyText, inviteCode, inviteLink } from '@/lib/invite';
import { LANG_LABELS, useI18n, type Lang } from '@/lib/i18n';

/* ============================================================
   Звуки — Web Audio API
   ============================================================ */

export type SoundName = 'click' | 'spark' | 'levelup' | 'error';

let audioCtx: AudioContext | null = null;

function soundEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('lvs:sound') !== 'off';
  } catch {
    return true;
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

function tone(
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
  const filter = ctx.createBiquadFilter();

  /* мягкая атака + низкий срез: объёмный «дорогой» звук без писков */
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2400, start);
  filter.frequency.exponentialRampToValueAtTime(1400, start + duration);
  filter.Q.setValueAtTime(0.35, start);

  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), start + duration);

  const attack = Math.min(0.04, duration * 0.4);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function playSound(name: SoundName) {
  if (!soundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;

  if (name === 'click') {
    /* тихий тёплый «тап» */
    tone(ctx, 560, 440, 0.1, 0.016, 'sine');
    tone(ctx, 280, 220, 0.13, 0.01, 'triangle', 0.005);
  } else if (name === 'spark') {
    /* объёмная искра: два мягких слоя и низкая подложка */
    tone(ctx, 660, 880, 0.22, 0.014, 'sine');
    tone(ctx, 990, 1320, 0.3, 0.011, 'sine', 0.08);
    tone(ctx, 440, 554, 0.24, 0.008, 'triangle', 0.02);
  } else if (name === 'levelup') {
    /* тёплое мажорное арпеджио без резких верхов */
    tone(ctx, 392, 523, 0.24, 0.016, 'sine');
    tone(ctx, 523, 659, 0.26, 0.014, 'sine', 0.14);
    tone(ctx, 659, 784, 0.34, 0.012, 'sine', 0.28);
  } else {
    /* глухой низкий стук */
    tone(ctx, 220, 165, 0.16, 0.016, 'triangle');
  }
}

/* ============================================================
   Кнопки, карточки, поля
   ============================================================ */

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'soft';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  href?: string;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-white text-bg font-semibold hover:bg-white/90 hover:shadow-[0_18px_40px_-18px_rgba(255,255,255,0.45)]',
  ghost:
    'border border-white/[0.12] text-white hover:border-white/[0.24] hover:bg-white/[0.05]',
  danger:
    'border border-danger/40 text-danger hover:border-danger hover:bg-danger/[0.12]',
  soft: 'bg-white/[0.06] text-white hover:bg-white/[0.1]',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-2 text-xs',
  md: 'px-5 py-2.5 text-[13px]',
  lg: 'px-7 py-3.5 text-sm',
  icon: 'h-10 w-10 p-0',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    variant = 'primary',
    size = 'md',
    asChild = false,
    href,
    onClick,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  const classes = cn(
    'btn focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40',
    buttonVariants[variant],
    buttonSizes[size],
    className,
  );

  const handleClick = (event: React.MouseEvent) => {
    playSound('click');
    onClick?.(event as React.MouseEvent<HTMLButtonElement>);
  };

  /* Ссылка важнее asChild: раньше клонировался <span> и href терялся. */
  if (href) {
    return (
      <Link href={href} className={classes} onClick={handleClick} aria-disabled={disabled || undefined}>
        {children}
      </Link>
    );
  }

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      className?: string;
      onClick?: (e: React.MouseEvent) => void;
    }>;
    return React.cloneElement(child, {
      className: cn(classes, child.props.className),
      onClick: (event: React.MouseEvent) => {
        playSound('click');
        child.props.onClick?.(event);
        onClick?.(event as React.MouseEvent<HTMLButtonElement>);
      },
    });
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

export function Card({
  children,
  className,
  hover = false,
  glow = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean; glow?: boolean }) {
  return (
    <div
      className={cn('card', hover && 'card-hover', glow && 'card-glow', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn('input', className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('input resize-none', className)} {...props} />;
});

/* ============================================================
   Бейджи и типографика
   ============================================================ */

type BadgeVariant = 'pro' | 'premium' | 'free' | 'danger' | 'success';

const badgeVariants: Record<BadgeVariant, string> = {
  pro: 'badge-pro',
  premium: 'badge-premium',
  free: 'badge-free',
  danger: 'badge-danger',
  success: 'badge-pro',
};

export function Badge({
  variant = 'pro',
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn('badge', badgeVariants[variant], className)}>{children}</span>;
}

export function TierBadge({ tier, className }: { tier?: string | null; className?: string }) {
  if (tier === 'premium') {
    return (
      <Badge variant="premium" className={className}>
        <Sparkles className="h-2.5 w-2.5" /> Premium
      </Badge>
    );
  }
  if (tier === 'pro') {
    return (
      <Badge variant="pro" className={className}>
        Pro
      </Badge>
    );
  }
  return (
    <Badge variant="free" className={className}>
      Free
    </Badge>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('divider', className)} />;
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn('section-title', className)}>{children}</h2>;
}

export function SectionSubtitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('section-subtitle', className)}>{children}</p>;
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('eyebrow', className)}>
      <span className="eyebrow-dot" />
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <div className="mb-3">{eyebrow}</div> : null}
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ============================================================
   Логотип — строгий монохром, тонкая типографика
   ============================================================ */

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn('flex select-none items-center gap-3', className)}>
      <span
        className={cn(
          'font-display font-extralight uppercase leading-none text-white',
          compact
            ? 'text-[13px] tracking-[0.4em]'
            : 'text-[15px] tracking-[0.42em] [margin-right:-0.42em]',
        )}
      >
        ЛВС
      </span>
      {!compact ? (
        <>
          <span className="h-5 w-px shrink-0 bg-white/[0.14]" />
          <span className="text-[8px] font-medium uppercase leading-[1.7] tracking-[0.24em] text-white/30">
            лучшая
            <br />
            версия себя
          </span>
        </>
      ) : null}
    </span>
  );
}

/* ============================================================
   Toasts — вместо системных уведомлений
   ============================================================ */

type ToastTone = 'default' | 'success' | 'danger';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

let toastSeq = 0;
let toastItems: ToastItem[] = [];
const toastListeners = new Set<(items: ToastItem[]) => void>();

function publishToasts() {
  const snapshot = [...toastItems];
  toastListeners.forEach((listener) => listener(snapshot));
}

export function dismissToast(id: number) {
  toastItems = toastItems.filter((item) => item.id !== id);
  publishToasts();
}

export function toast(
  title: string,
  options: { description?: string; tone?: ToastTone } = {},
) {
  const item: ToastItem = {
    id: (toastSeq += 1),
    title,
    description: options.description,
    tone: options.tone ?? 'default',
  };
  toastItems = [...toastItems.slice(-2), item];
  publishToasts();
  window.setTimeout(() => dismissToast(item.id), 3800);
}

export function ToastHost() {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    toastListeners.add(setItems);
    setItems([...toastItems]);
    return () => {
      toastListeners.delete(setItems);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[90] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-6 sm:top-6"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence initial={false}>
        {items.map((item) => {
          const Icon = item.tone === 'danger' ? X : item.tone === 'success' ? Check : Sparkles;
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-2xl border bg-[#151517]/95 px-4 py-3 shadow-panel backdrop-blur-xl',
                item.tone === 'danger'
                  ? 'border-danger/30'
                  : item.tone === 'success'
                    ? 'border-primary/30'
                    : 'border-white/[0.1]',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                  item.tone === 'danger'
                    ? 'border-danger/30 text-danger'
                    : item.tone === 'success'
                      ? 'border-primary/30 text-primary'
                      : 'border-white/[0.12] text-white/60',
                )}
              >
                <Icon className="h-3 w-3" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-white">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(item.id)}
                className="mt-0.5 text-white/25 transition-colors hover:text-white"
                aria-label="Закрыть уведомление"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   Модалка приглашения
   ============================================================ */

export function InviteModal({
  open,
  onClose,
  username,
  code,
}: {
  open: boolean;
  onClose: () => void;
  username?: string | null;
  code?: string | null;
}) {
  const [link, setLink] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setCopied(false);
    setLink(inviteLink(username || demoUser.username, code));
  }, [open, username, code]);

  const copy = async () => {
    const ok = await copyText(link);
    if (!ok) {
      toast('Не удалось скопировать', {
        description: 'Выделите ссылку и скопируйте вручную',
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

  const share = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'ЛВС — Лучшая Версия Себя',
          text: 'Присоединяйся к моему кругу роста в ЛВС',
          url: link,
        });
        playSound('levelup');
        return;
      } catch {
        /* пользователь отменил */
      }
    }
    void copy();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Пригласить друга"
      subtitle="Отправьте ссылку — друг попадёт в ваш круг и получит месяц Pro."
      width="max-w-md"
    >
      <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-3">
        <Link2 className="h-4 w-4 shrink-0 text-muted" />
        <span className="truncate text-[12px] text-white/75">{link || '…'}</span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Скопировано' : 'Скопировать'}
        </Button>
        <Button variant="ghost" onClick={share}>
          <Share2 className="h-4 w-4" /> Поделиться
        </Button>
      </div>

      <div className="mt-5 space-y-2.5 border-t border-white/[0.06] pt-4">
        {[
          'Отправьте ссылку другу',
          'Он регистрируется и выбирает цель',
          'Вы получаете бонус, он — месяц Pro',
        ].map((text, index) => (
          <div key={text} className="flex items-center gap-3">
            <span className="numeric flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/[0.1] text-[9px] text-white/50">
              {index + 1}
            </span>
            <span className="text-[11.5px] text-muted">{text}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[10.5px] text-white/25">
        Код приглашения:{' '}
        <span className="font-mono tracking-wider text-white/50">
          {code || (username ? inviteCode(username) : inviteCode(demoUser.username))}
        </span>
      </p>
    </Modal>
  );
}

/* ============================================================
   Аватар, прогресс, переключатель
   ============================================================ */

export function Avatar({
  src,
  size = 40,
  fallback,
  className,
  ring = false,
}: {
  src?: string | null;
  size?: number;
  fallback?: string | null;
  className?: string;
  ring?: boolean;
}) {
  const letter = (fallback || 'Л').slice(0, 1).toUpperCase();
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full border border-white/[0.12] bg-white/[0.06]',
        ring && 'ring-2 ring-primary/60 ring-offset-2 ring-offset-bg',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Аватар" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-display text-sm font-bold text-white/70">
          {letter}
        </div>
      )}
    </div>
  );
}

export function Progress({
  value,
  className,
  barClassName,
  glow = true,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  glow?: boolean;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]', className)}>
      <div
        className={cn('h-full rounded-full bg-primary transition-all duration-700 ease-out', barClassName)}
        style={{
          width: `${safe}%`,
          boxShadow: glow ? '0 0 18px rgba(168, 255, 53, 0.55)' : undefined,
        }}
      />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        playSound('click');
        onChange(!checked);
      }}
      className={cn(
        'relative flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-300',
        checked ? 'border-primary/60 bg-primary' : 'border-white/[0.18] bg-white/[0.06]',
      )}
    >
      <span
        className={cn(
          'block h-[18px] w-[18px] rounded-full transition-transform duration-300',
          checked ? 'translate-x-[23px] bg-bg' : 'translate-x-[3px] bg-white/70',
        )}
      />
    </button>
  );
}

export function SoundToggle({ compact = false }: { compact?: boolean }) {
  const [enabled, setEnabled] = React.useState(true);

  React.useEffect(() => {
    try {
      setEnabled(window.localStorage.getItem('lvs:sound') !== 'off');
    } catch {
      setEnabled(true);
    }
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    try {
      window.localStorage.setItem('lvs:sound', next ? 'on' : 'off');
    } catch {
      /* приватный режим */
    }
    if (next) playSound('click');
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={enabled ? 'Выключить звуки' : 'Включить звуки'}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] text-muted transition-colors hover:bg-white/[0.04] hover:text-white"
    >
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      <span className="flex-1 text-left">Звуки</span>
      <span
        className={cn(
          'relative flex h-5 w-9 items-center rounded-full border transition-colors',
          enabled ? 'border-primary/50 bg-primary/90' : 'border-white/[0.18] bg-white/[0.06]',
        )}
      >
        <span
          className={cn(
            'h-3.5 w-3.5 rounded-full transition-transform',
            enabled ? 'translate-x-[19px] bg-bg' : 'translate-x-[3px] bg-white/60',
          )}
        />
      </span>
    </button>
  );
}

export function TaskCheckbox({
  checked,
  onToggle,
  className,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        playSound(checked ? 'click' : 'spark');
        onToggle();
      }}
      aria-pressed={checked}
      aria-label={label || (checked ? 'Снять отметку' : 'Выполнено')}
      className={cn(
        'relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-300 active:scale-95',
        checked
          ? 'border-primary bg-primary text-bg shadow-[0_0_18px_-2px_rgba(168,255,53,0.75)]'
          : 'border-white/[0.22] text-transparent hover:border-white/[0.42] hover:bg-white/[0.04]',
        className,
      )}
    >
      {checked ? (
        <svg
          className="animate-check-draw h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="20 6 9 17 4 12" style={{ strokeDasharray: 24 }} />
        </svg>
      ) : null}
    </button>
  );
}

/* ============================================================
   Модальные окна
   ============================================================ */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-3 backdrop-blur-md sm:items-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={cn(
              'relative w-full overflow-hidden rounded-[26px] border border-white/[0.1] bg-[#151517]/95 shadow-panel backdrop-blur-2xl',
              width,
            )}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            {(title || subtitle) && (
              <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
                <div className="min-w-0">
                  {title ? (
                    <h3 className="font-display text-lg font-bold tracking-[-0.02em] text-white">{title}</h3>
                  ) : null}
                  {subtitle ? <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{subtitle}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Закрыть"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-muted transition-colors hover:border-white/20 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="max-h-[70vh] overflow-y-auto px-6 pb-6">{children}</div>
            {footer ? (
              <div className="border-t border-white/[0.07] bg-white/[0.02] px-6 py-4">{footer}</div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ============================================================
   Служебные состояния
   ============================================================ */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-muted', className)} aria-label="Загрузка" />;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
    >
      {message}
    </p>
  );
}

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-muted">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-display text-base font-bold text-white">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Confetti({ show, pieces = 48 }: { show: boolean; pieces?: number }) {
  const colors = ['#A8FF35', '#FFFFFF', '#D4AF37', '#7CFF8A'];
  const [seed, setSeed] = React.useState(0);
  React.useEffect(() => {
    if (show) setSeed((s) => s + 1);
  }, [show]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden>
      {Array.from({ length: pieces }).map((_, i) => {
        const left = (i * 37 + seed * 11) % 100;
        const delay = ((i * 13) % 20) / 100;
        const duration = 2.2 + ((i * 7) % 14) / 10;
        const drift = ((i * 29) % 120) - 60;
        const size = 5 + ((i * 5) % 7);
        return (
          <motion.span
            key={`${seed}-${i}`}
            initial={{ opacity: 0, y: -40, x: 0, rotate: 0 }}
            animate={{ opacity: [0, 1, 1, 0], y: '105vh', x: drift, rotate: 360 + (i % 5) * 120 }}
            transition={{ duration, delay, ease: 'easeIn' }}
            className="absolute top-0 rounded-[2px]"
            style={{
              left: `${left}%`,
              width: size,
              height: size * 1.8,
              backgroundColor: colors[i % colors.length],
            }}
          />
        );
      })}
    </div>
  );
}

/* ============================================================
   PWA
   ============================================================ */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PWAInstallCard() {
  const [promptEvent, setPromptEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = React.useState(false);
  const [installed, setInstalled] = React.useState(false);

  React.useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setInstalled(window.matchMedia('(display-mode: standalone)').matches);

    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      playSound('levelup');
    }
    setPromptEvent(null);
  };

  return (
    <Card className="overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/[0.07] blur-2xl" />
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.08] text-primary">
          <Plus className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-bold text-white">Установить ЛВС на телефон</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            Приложение откроется на весь экран, без адресной строки. Работает как нативное.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {installed ? (
          <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/[0.06] px-3.5 py-2.5 text-[12px] text-primary">
            <Check className="h-4 w-4" /> Приложение уже установлено
          </div>
        ) : promptEvent ? (
          <Button onClick={install} className="w-full">
            Установить приложение
          </Button>
        ) : (
          <Button variant="ghost" className="w-full" disabled>
            {isIOS ? 'Установка через Safari' : 'Откройте в поддерживаемом браузере'}
          </Button>
        )}

        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            {isIOS ? 'Инструкция для iOS' : 'Инструкция'}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/60">
            {isIOS
              ? 'Нажмите «Поделиться» в Safari → «На экран «Домой»» → «Добавить».'
              : 'Меню браузера (⋮) → «Установить приложение» или «Добавить на главный экран».'}
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
   Уведомления, язык, гейты доступа
   ============================================================ */

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  kind: string;
  read: boolean;
  created_at: string;
};

function timeAgo(iso: string) {
  const date = new Date(iso);
  const diff = Math.max(0, Date.now() - date.getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} ч`;
  const days = Math.floor(hours / 24);
  return `${days} дн`;
}

export function NotificationBell({ className }: { className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const boxRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch('/api/me/notifications', { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as NotificationItem[];
      if (Array.isArray(data)) setItems(data);
    } catch {
      /* API недоступен — колокольчик остаётся пустым */
    }
  }, []);

  React.useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const unread = items.filter((item) => !item.read).length;

  const markAll = async () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    try {
      await fetch('/api/me/notifications/read', { method: 'POST', credentials: 'same-origin' });
    } catch {
      /* тихо */
    }
  };

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => {
          playSound('click');
          setOpen((value) => !value);
          if (!open) void load();
        }}
        aria-label={t('notif.title')}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.1] text-white/70 transition-colors hover:border-white/25 hover:text-white"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.7} />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold text-bg">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-12 z-[60] w-[320px] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#151517]/98 shadow-panel backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <p className="text-[12.5px] font-semibold text-white">{t('notif.title')}</p>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={markAll}
                  className="flex items-center gap-1 text-[10.5px] text-white/45 transition-colors hover:text-white"
                >
                  <CheckCheck className="h-3 w-3" /> {t('notif.markAll')}
                </button>
              ) : null}
            </div>
            <div className="max-h-[340px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="mx-auto h-5 w-5 text-white/20" />
                  <p className="mt-2 text-[12px] font-medium text-white/70">{t('notif.empty')}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">{t('notif.emptyText')}</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex gap-3 border-b border-white/[0.05] px-4 py-3 last:border-0',
                      !item.read && 'bg-white/[0.025]',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                        item.read ? 'bg-white/15' : 'bg-white/70',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium leading-snug text-white">{item.title}</p>
                      {item.body ? (
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted">{item.body}</p>
                      ) : null}
                      <p className="mt-1 text-[9.5px] uppercase tracking-[0.12em] text-white/25">
                        {timeAgo(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const options: Lang[] = ['ru', 'kz', 'en'];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          playSound('click');
          setOpen((value) => !value);
        }}
        aria-label={t('lang.title')}
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 rounded-full border border-white/[0.1] text-white/70 transition-colors hover:border-white/25 hover:text-white',
          compact ? 'h-10 px-3 text-[11px]' : 'h-9 px-3 text-[11px]',
        )}
      >
        <Globe className="h-3.5 w-3.5" />
        {LANG_LABELS[lang]}
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-11 z-[60] w-40 overflow-hidden rounded-xl border border-white/[0.1] bg-[#151517]/98 p-1 shadow-panel backdrop-blur-2xl"
          >
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setLang(option);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12px] transition-colors hover:bg-white/[0.06]',
                  option === lang ? 'text-white' : 'text-muted',
                )}
              >
                {t(`lang.${option}` as 'lang.ru')}
                {option === lang ? <Check className="h-3 w-3" /> : null}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function AccessGate({ blocked = false }: { blocked?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[calc(100vh-60px)] items-center justify-center px-5 py-12 lg:min-h-screen">
      <div className="w-full max-w-md rounded-[26px] border border-white/[0.1] bg-surface/90 p-7 text-center backdrop-blur-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.04] text-white/70">
          {blocked ? <ShieldAlert className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
        </div>
        <h1 className="mt-5 font-display text-xl font-bold text-white">
          {blocked ? t('blocked.title') : t('paywall.title')}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted">
          {blocked ? t('blocked.text') : t('paywall.text')}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button href={blocked ? '/contacts' : '/pricing'}>
            {blocked ? t('blocked.support') : t('paywall.cta')}
          </Button>
          <Button variant="ghost" href="/profile">
            {t('dash.profile')}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Навигация и оболочка приложения
   ============================================================ */

const SIDEBAR_ITEMS = [
  { href: '/dashboard', key: 'nav.dashboard', icon: Home, exact: true },
  { href: '/tracker', key: 'nav.system', icon: Activity, exact: true },
  { href: '/tracker/12-weeks', key: 'nav.quarter', icon: Clock },
  { href: '/tracker/tempo', key: 'nav.tempo', icon: Gauge },
  { href: '/journal', key: 'nav.journal', icon: BookOpen },
  { href: '/marathons', key: 'nav.marathons', icon: Trophy },
  { href: '/knowledge', key: 'nav.knowledge', icon: GraduationCap },
  { href: '/friends', key: 'nav.friends', icon: Users },
  { href: '/settings', key: 'nav.settings', icon: Settings },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { user, logout, demo } = useAuth();
  const { t } = useI18n();

  const username = user?.username || demoUser.username;
  const tier = user?.tier || demoUser.tier;
  const avatar = user?.avatar_url;
  const streak = user?.streak ?? demoUser.streak;
  const isOwner = user?.role === 'owner';

  const handleLogout = async () => {
    playSound('click');
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-5 pt-6">
        <Link
          href="/dashboard"
          className="flex items-center"
          onClick={onNavigate}
          aria-label="ЛВС — на дашборд"
        >
          <Logo />
        </Link>
        {onNavigate ? (
          <button
            type="button"
            onClick={onNavigate}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-white/[0.06] hover:text-white lg:hidden"
            aria-label="Закрыть меню"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Основное меню">
        <p className="px-3 pb-2 pt-2 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-white/25">
          {t('nav.platform')}
        </p>
        <div className="space-y-0.5">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href, 'exact' in item ? item.exact : undefined);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn('nav-item', active && 'active')}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-[17px] w-[17px]" strokeWidth={1.8} aria-hidden />
                <span>{t(item.key)}</span>
              </Link>
            );
          })}
        </div>

        {isOwner ? (
          <>
            <p className="px-3 pb-2 pt-6 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-white/25">
              {t('nav.owner')}
            </p>
            <Link
              href="/admin"
              onClick={onNavigate}
              className={cn('nav-item', isActive(pathname, '/admin') && 'active')}
            >
              <Shield className="h-[17px] w-[17px]" strokeWidth={1.8} aria-hidden />
              <span>{t('nav.admin')}</span>
            </Link>
          </>
        ) : null}

        <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
          <div className="flex items-center gap-2 text-white/70">
            <Flame
              className={cn('h-3.5 w-3.5', streak > 0 ? 'text-[#FF5A36]' : 'text-white/25')}
              fill={streak > 0 ? 'currentColor' : 'none'}
              strokeWidth={1.6}
            />
            <p className="text-[11px] font-semibold">{streak > 0 ? t('shell.streak') : t('shell.streakStart')}</p>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
            {streak > 0
              ? `${streak} ${plural(streak, 'день', 'дня', 'дней')} ${t('shell.streakOn')}`
              : t('shell.streakOff')}
          </p>
        </div>
      </nav>

      <div className="border-t border-white/[0.07] p-3">
        {demo ? (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[10px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
            {t('shell.demo')}
          </div>
        ) : null}
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <LanguageSwitcher />
          <NotificationBell />
        </div>
        <SoundToggle />
        <Link
          href="/profile"
          onClick={onNavigate}
          className="mt-1 flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-white/[0.04]"
        >
          <Avatar src={avatar} size={36} fallback={username} ring />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-white">{username}</p>
            <p className="truncate text-[10.5px] text-muted">
              {tierLabels[tier] || 'Pro'} {t('shell.subscription')}
            </p>
          </div>
          <TierBadge tier={tier} />
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-[12px] text-white/35 transition-colors hover:bg-danger/[0.06] hover:text-danger"
        >
          <LogOut className="h-3.5 w-3.5" /> {t('shell.logout')}
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-white/[0.07] bg-[#0d0d0f]/95 backdrop-blur-2xl lg:block">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              key="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              key="sidebar-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-white/[0.08] bg-[#0d0d0f] lg:hidden"
            >
              <SidebarContent onNavigate={onClose} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export function AppShell({
  children,
  className,
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname() || '';
  const { user, demo, loading } = useAuth();

  const openPaths = ['/paywall', '/pricing', '/settings', '/profile', '/contacts', '/login', '/auth'];
  const gate = !demo && !loading && Boolean(user) && !openPaths.some((path) => pathname.startsWith(path));
  const blocked = gate && Boolean(user?.is_blocked);
  const noAccess = gate && !blocked && user?.has_access === false;

  return (
    <div className={cn('relative min-h-screen bg-bg', className)}>
      <div className="pointer-events-none fixed inset-0 app-glow" aria-hidden />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Мобильная шапка */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.07] bg-bg/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.1] text-white"
          aria-label="Открыть меню"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Link href="/dashboard" className="flex items-center" aria-label="ЛВС — на дашборд">
          <Logo compact />
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link href="/profile" aria-label="Профиль">
            <Avatar src={user?.avatar_url} size={34} fallback={user?.username || 'Л'} ring />
          </Link>
        </div>
      </header>

      {/* Верхняя панель на десктопе: язык и уведомления всегда под рукой */}
      <div className="pointer-events-none sticky top-0 z-30 hidden justify-end px-10 py-4 lg:flex">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/[0.07] bg-bg/70 p-1.5 backdrop-blur-xl">
          <LanguageSwitcher compact />
          <NotificationBell />
        </div>
      </div>

      <main
        className={cn(
          'relative min-h-screen lg:pl-[260px]',
          className,
        )}
      >
        <div className={cn('mx-auto w-full', wide ? 'max-w-none' : 'max-w-[1360px]')}>
          {blocked ? <AccessGate blocked /> : noAccess ? <AccessGate /> : children}
        </div>
      </main>

      <ToastHost />
    </div>
  );
}
