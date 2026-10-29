import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Пользовательское соглашение',
};

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
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
            Документы
          </p>
          <h1 className="mt-4 font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-[34px]">
            Пользовательское соглашение
          </h1>

          <div className="mt-8 space-y-5 text-[13.5px] leading-relaxed text-white/50">
            <p>
              Настоящее Пользовательское соглашение регулирует использование платформы «ЛВС — Лучшая
              Версия Себя» (далее — Сервис).
            </p>
            <p>
              Регистрируясь и используя Сервис, вы выражаете безусловное согласие с настоящим
              Соглашением. Если вы не согласны с какими-либо положениями, пожалуйста, воздержитесь от
              использования Сервиса.
            </p>
            <p>
              Вход в личный кабинет осуществляется через подтверждение в Telegram-боте @lvs_key_bot.
              Пароль показывается один раз при регистрации и может быть восстановлен через бота.
            </p>
            <p>
              Администрация не несёт ответственности за утерю доступа к аккаунту в случае передачи
              учётных данных третьим лицам.
            </p>
            <p>Соглашение может быть обновлено. Текущая версия доступна на этой странице.</p>
          </div>

          <div className="mt-10 border-t border-white/[0.07] pt-6">
            <p className="text-[11px] text-white/25">
              © {new Date().getFullYear()} ЛВС. Все права защищены.
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}
