'use client';

import { Check, Layers } from 'lucide-react';
import { categoryOf, type KnowledgeArticle } from '@/lib/knowledge';
import { cn } from '@/lib/utils';

/**
 * 3D-обложка статьи. Для «Привычек» — стопка карточек привычки,
 * для остальных категорий — наклонная стеклянная плоскость.
 */
export function KnowledgeCover({
  article,
  variant = 'card',
  className,
}: {
  article: KnowledgeArticle;
  variant?: 'card' | 'hero';
  className?: string;
}) {
  const category = categoryOf(article);
  const habits = article.category === 'habits';
  const hero = variant === 'hero';

  return (
    <div
      className={cn(
        'relative overflow-hidden border border-white/[0.08] bg-[#0b0b0d]',
        hero ? 'rounded-[28px]' : 'rounded-xl',
        className,
      )}
      aria-hidden
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br', category.gradient)} />
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)',
          backgroundSize: hero ? '34px 34px' : '22px 22px',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.16), transparent 46%), radial-gradient(circle at 88% 92%, rgba(0,0,0,0.5), transparent 55%)',
        }}
      />

      {/* 3D-сцена */}
      <div className={cn('absolute inset-0 [perspective:900px]', hero && '[perspective:1200px]')}>
        {habits ? (
          <div className="absolute left-1/2 top-1/2 [transform-style:preserve-3d] [transform:translate(-50%,-50%)_rotateX(20deg)_rotateZ(-13deg)]">
            {[0, 1, 2].map((layer) => (
              <div
                key={layer}
                className={cn(
                  'absolute rounded-2xl border border-white/[0.14] bg-white/[0.055] shadow-[0_22px_50px_-16px_rgba(0,0,0,0.85)] backdrop-blur-[2px]',
                  hero ? 'h-[104px] w-[142px]' : 'h-[62px] w-[86px]',
                )}
                style={{
                  left: hero ? -71 : -43,
                  top: hero ? -52 : -31,
                  transform: `translate3d(${layer * (hero ? 13 : 8)}px, ${layer * (hero ? -10 : -6)}px, ${layer * (hero ? 30 : 18)}px)`,
                  opacity: 1 - layer * 0.16,
                }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.12] to-transparent" />
                <div
                  className={cn('absolute left-2 top-2 h-1 rounded-full bg-white/25', hero ? 'w-10' : 'w-6')}
                />
                <div
                  className={cn('absolute left-2 h-1 rounded-full bg-white/15', hero ? 'top-5 w-14' : 'top-4 w-9')}
                />
                {layer === 2 ? (
                  <div
                    className={cn(
                      'absolute right-2 top-2 grid place-items-center rounded-full border border-[#A8FF35]/50 bg-[#A8FF35]/20 text-[#D9FF9E]',
                      hero ? 'h-7 w-7' : 'h-5 w-5',
                    )}
                  >
                    <Check className={hero ? 'h-4 w-4' : 'h-3 w-3'} strokeWidth={3} />
                  </div>
                ) : null}
              </div>
            ))}
            <div
              className={cn(
                'absolute rounded-full border border-[#A8FF35]/30',
                hero ? '-left-[92px] -top-[76px] h-[184px] w-[184px]' : '-left-[54px] -top-[46px] h-[108px] w-[108px]',
              )}
              style={{ transform: 'rotateX(72deg)' }}
            />
          </div>
        ) : (
          <div className="absolute left-1/2 top-1/2 [transform-style:preserve-3d] [transform:translate(-50%,-50%)_rotateX(16deg)_rotateY(-22deg)]">
            <div
              className={cn(
                'relative rounded-2xl border border-white/[0.16] bg-white/[0.055] shadow-[0_26px_60px_-18px_rgba(0,0,0,0.9)] backdrop-blur-[2px]',
                hero ? 'h-[150px] w-[210px]' : 'h-[92px] w-[128px]',
              )}
              style={{ transform: 'translateZ(24px)' }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.14] to-transparent" />
              <span
                className={cn(
                  'numeric absolute font-display font-extrabold leading-none tracking-[-0.05em] text-white/20',
                  hero ? 'right-4 top-3 text-[64px]' : 'right-3 top-2 text-[40px]',
                )}
              >
                {String(article.n).padStart(2, '0')}
              </span>
              <Layers
                className={cn('absolute bottom-3 left-3 text-white/25', hero ? 'h-7 w-7' : 'h-5 w-5')}
                strokeWidth={1.2}
              />
            </div>
            <div
              className={cn(
                'absolute rounded-full border border-white/20',
                hero ? '-left-[120px] -top-[96px] h-[250px] w-[250px]' : '-left-[70px] -top-[56px] h-[146px] w-[146px]',
              )}
              style={{ transform: 'rotateX(74deg)' }}
            />
          </div>
        )}
      </div>

      <div className="absolute left-3 top-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.14em] text-white/70 backdrop-blur',
            hero && 'text-[10px]',
          )}
        >
          {category.title}
        </span>
      </div>

      {article.practical ? (
        <div className="absolute right-3 top-3">
          <span className="rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-white/80 backdrop-blur">
            Практика
          </span>
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
    </div>
  );
}
