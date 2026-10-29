'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Clock,
  Share2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { AppShell, Badge, Button, Card, playSound, toast } from '@/components/ui';
import { KnowledgeCover } from '@/components/knowledge-cover';
import {
  categoryOf,
  getArticle,
  knowledgeArticles,
  relatedArticles,
} from '@/lib/knowledge';
import { cn } from '@/lib/utils';

const SAVED_KEY = 'lvs:knowledge:saved';

export default function KnowledgeArticlePage({ params }: { params: { id: string } }) {
  const article = getArticle(params.id);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVED_KEY);
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      setSaved(Array.isArray(ids) && ids.includes(params.id));
    } catch {
      /* приватный режим */
    }
  }, [params.id]);

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(100, Math.round((window.scrollY / scrollable) * 100)) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const paragraphs = useMemo(() => (article ? article.body.split('\n\n').filter(Boolean) : []), [article]);
  const related = useMemo(() => (article ? relatedArticles(article, 3) : []), [article]);
  const next = useMemo(() => {
    if (!article) return null;
    const index = knowledgeArticles.findIndex((item) => item.id === article.id);
    return knowledgeArticles[(index + 1) % knowledgeArticles.length];
  }, [article]);

  const toggleSaved = () => {
    if (!article) return;
    const nextSaved = !saved;
    setSaved(nextSaved);
    playSound(nextSaved ? 'spark' : 'click');
    try {
      const raw = window.localStorage.getItem(SAVED_KEY);
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      const set = new Set(Array.isArray(ids) ? ids : []);
      if (nextSaved) set.add(article.id);
      else set.delete(article.id);
      window.localStorage.setItem(SAVED_KEY, JSON.stringify([...set]));
    } catch {
      /* приватный режим */
    }
  };

  const share = async () => {
    if (!article) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast('Ссылка скопирована', { tone: 'success' });
      }
      playSound('click');
    } catch {
      /* пользователь отменил */
    }
  };

  if (!article) {
    return (
      <AppShell>
        <div className="px-5 py-16 text-center">
          <h1 className="font-display text-2xl font-bold text-white">Статья не найдена</h1>
          <p className="mt-2 text-[12.5px] text-muted">Возможно, материал был перемещён.</p>
          <Button className="mt-6" href="/knowledge">
            Вернуться в библиотеку
          </Button>
        </div>
      </AppShell>
    );
  }

  const category = categoryOf(article);

  return (
    <AppShell>
      <div className="fixed left-0 right-0 top-0 z-50 h-0.5 bg-white/[0.04] lg:left-[260px]">
        <div
          className="h-full bg-white transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/knowledge"
              className="inline-flex items-center gap-2 text-[11.5px] text-muted transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> База знаний
            </Link>
            <span className="numeric text-[10.5px] text-muted">{progress}% прочитано</span>
          </div>

          <article>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="pro">{category.title}</Badge>
              {article.practical ? <Badge variant="free">Практика</Badge> : null}
              <span className="flex items-center gap-1.5 text-[10.5px] text-muted">
                <Clock className="h-3 w-3" /> {article.read_time} чтения
              </span>
            </div>

            <h1 className="mt-4 font-display text-[30px] font-extrabold leading-[1.08] tracking-[-0.035em] text-white sm:text-[40px]">
              {article.title}
            </h1>
            <p className="mt-4 text-[14px] leading-relaxed text-muted sm:text-[15px]">{article.excerpt}</p>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-white/[0.07] py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] text-white/60">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-white">Редакция ЛВС</p>
                  <p className="text-[10px] text-muted">Проверено кураторами · материал {article.n} из {knowledgeArticles.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={toggleSaved}>
                  <Bookmark className={cn('h-3.5 w-3.5', saved && 'fill-white text-white')} />
                  {saved ? 'В закладках' : 'Сохранить'}
                </Button>
                <Button variant="ghost" size="icon" aria-label="Поделиться" onClick={share}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <KnowledgeCover article={article} variant="hero" className="mt-7 h-56 sm:h-72" />

            <div className="mx-auto mt-8 max-w-2xl">
              {paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className={cn(
                    'mb-6 text-[15px] leading-[1.85] text-white/80 sm:text-[16px]',
                    index === 0 &&
                      'first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-display first-letter:text-[52px] first-letter:font-extrabold first-letter:leading-[0.8] first-letter:text-white',
                  )}
                >
                  {paragraph}
                </p>
              ))}

              <div className="my-8 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-5">
                <div className="flex items-center gap-2 text-white">
                  <Zap className="h-4 w-4" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Попробуйте сегодня</p>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-white/70">
                  Выберите одно действие из статьи и отметьте его в трекере. Неделя наблюдений даст больше,
                  чем месяц чтения.
                </p>
                <Button className="mt-4" size="sm" href="/dashboard">
                  Открыть трекер <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              {next ? (
                <Link
                  href={`/knowledge/${next.id}`}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-4 transition-colors hover:border-white/[0.18] hover:bg-white/[0.04]"
                >
                  <div className="min-w-0">
                    <p className="text-[9.5px] uppercase tracking-[0.16em] text-white/30">Следующий материал</p>
                    <p className="mt-1 line-clamp-1 text-[13px] font-semibold text-white">{next.title}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                </Link>
              ) : null}
            </div>
          </article>

          {/* Похожие */}
          <div className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Читайте дальше</h2>
              <Link href="/knowledge" className="text-[11px] text-muted hover:text-white">
                Вся библиотека →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {related.map((item) => (
                <Link key={item.id} href={`/knowledge/${item.id}`}>
                  <Card hover className="h-full overflow-hidden p-3">
                    <KnowledgeCover article={item} className="h-24" />
                    <div className="px-1 pb-1 pt-3">
                      <p className="text-[9.5px] uppercase tracking-[0.12em] text-white/30">
                        {categoryOf(item).title}
                      </p>
                      <h3 className="mt-1.5 line-clamp-2 font-display text-[12.5px] font-bold leading-snug text-white">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted">
                        <Clock className="h-3 w-3" /> {item.read_time}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-[10.5px] text-muted">
            <Check className="h-3.5 w-3.5" /> Материал прочитан — отметьте привычку в трекере
          </div>
        </div>
      </div>
    </AppShell>
  );
}
