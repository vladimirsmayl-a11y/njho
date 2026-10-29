'use client';

import {
  BookOpen,
  Brain,
  Dumbbell,
  Smartphone,
  Sunrise,
  Wallet,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS: Record<string, React.ElementType> = {
  sunrise: Sunrise,
  brain: Brain,
  dumbbell: Dumbbell,
  book: BookOpen,
  phone: Smartphone,
  wallet: Wallet,
  flame: Flame,
};

export function MarathonCover({
  icon = 'flame',
  cover = 'from-[#1b2a12] via-[#0f1a0a] to-[#0a0a0a]',
  accent = 'text-primary',
  image,
  className,
  size = 'md',
  children,
}: {
  icon?: string;
  cover?: string;
  accent?: string;
  image?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}) {
  const Icon = ICONS[icon] || Flame;
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br',
        cover,
        size === 'sm' ? 'h-32' : size === 'lg' ? 'h-72' : 'h-44',
        className,
      )}
    >
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/30" />
        </>
      ) : (
        <>
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.16), transparent 42%), radial-gradient(circle at 80% 90%, rgba(255,255,255,0.08), transparent 45%)',
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)',
              backgroundSize: '34px 34px',
              maskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, #000 20%, transparent 100%)',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon
              className={cn(
                'opacity-70 transition-transform duration-500 group-hover:scale-110',
                accent,
                size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-20 w-20' : 'h-14 w-14',
              )}
              strokeWidth={1.2}
            />
          </div>
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
      {children}
    </div>
  );
}
