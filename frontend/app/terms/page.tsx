import { ArrowLeft, BadgeCheck, CalendarDays, Mail, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Публичная оферта и пользовательское соглашение',
};

const SECTIONS = [
  {
    title: '1. Общие положения',
    body: 'Настоящее Пользовательское соглашение (далее — Соглашение) регулирует использование платформы «ЛВС — Лучшая Версия Себя» (далее — Сервис). Регистрируясь и используя Сервис, вы выражаете безусловное согласие с настоящим Соглашением. Если вы не согласны с какими-либо положениями, пожалуйста, воздержитесь от использования Сервиса.',
  },
  {
    title: '2. Регистрация и доступ',
    body: 'Вход в личный кабинет осуществляется через подтверждение в Telegram-боте @lvs_key_bot. Пароль показывается один раз при регистрации и может быть восстановлен через бота. Вы обязуетесь не передавать учётные данные третьим лицам и несёте ответственность за действия, совершённые под вашим аккаунтом.',
  },
  {
    title: '3. Тарифы и оплата',
    body: 'Доступ к Сервису предоставляется на условиях выбранного тарифа. Оплата производится ежемесячно через доступные платёжные методы. Подписку можно отменить в любой момент в Telegram-боте — доступ сохраняется до конца оплаченного периода. Актуальные цены и состав тарифов указаны на странице «Тарифы».',
  },
  {
    title: '4. Правила использования',
    body: 'Запрещается использовать Сервис для распространения незаконного контента, спама, оскорблений и материалов, нарушающих права третьих лиц. Администрация вправе ограничить доступ при нарушении правил, а также при попытке обхода технических ограничений платформы.',
  },
  {
    title: '5. Ответственность',
    body: 'Сервис предоставляется «как есть». Администрация не несёт ответственности за утерю доступа к аккаунту в случае передачи учётных данных третьим лицам, а также за решения, принятые пользователем на основании материалов платформы. Сервис не является медицинской или психотерапевтической организацией и не заменяет консультацию специалиста.',
  },
  {
    title: '6. Изменения',
    body: 'Соглашение может быть обновлено. Актуальная редакция всегда доступна на этой странице. Продолжение использования Сервиса после публикации изменений означает согласие с новой редакцией.',
  },
];

export default function TermsPage() {
  return (
    <main className="relative min-h-screen px-5 py-12 sm:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[620px] -translate-x-1/2 rounded-full bg-neon/[0.04] blur-[120px]"
      />

      <div className="relative mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[12px] text-white/35 transition hover:text-white/70"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          На главную
        </Link>

        <article className="card mt-6 p-8 sm:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neon/25 bg-neon/[0.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-neon/90">
              <BadgeCheck className="h-3 w-3" /> Действует
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-white/40">
              <CalendarDays className="h-3 w-3" /> Редакция от 1 января 2026
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-white/40">
              <ShieldCheck className="h-3 w-3" /> Публичный документ
            </span>
          </div>

          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
            Документы
          </p>
          <h1 className="mt-4 font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-[34px]">
            Публичная оферта и пользовательское соглашение
          </h1>
          <p className="mt-4 text-[12.5px] leading-relaxed text-white/35">
            Условия доступа к платформе «ЛВС — Лучшая Версия Себя», порядок оплаты
            и правила использования личного кабинета.
          </p>

          <div className="mt-8 space-y-7">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="font-display text-[15px] font-bold tracking-[-0.01em] text-white/85">
                  {section.title}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-white/50">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/25">
              Вопросы по документу
            </p>
            <a
              href="mailto:hello@lvs.ru"
              className="mt-2 inline-flex items-center gap-2 text-[13px] text-white/65 transition hover:text-white"
            >
              <Mail className="h-3.5 w-3.5 text-white/30" />
              hello@lvs.ru
            </a>
            <p className="mt-2 text-[11px] leading-relaxed text-white/30">
              Также можно обратиться в поддержку через Telegram-бот @lvs_key_bot.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-[11px] text-white/25 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} ЛВС. Все права защищены.</p>
            <div className="flex items-center gap-3">
              <Link href="/privacy" className="transition hover:text-white/60">
                Политика конфиденциальности
              </Link>
              <span className="h-1 w-1 rounded-full bg-white/15" />
              <Link href="/contacts" className="transition hover:text-white/60">
                Контакты
              </Link>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
