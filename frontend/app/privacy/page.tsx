import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Политика конфиденциальности',
};

export default function PrivacyPage() {
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
            Политика конфиденциальности
          </h1>

          <div className="mt-8 space-y-5 text-[13.5px] leading-relaxed text-white/50">
            <p>
              Мы уважаем конфиденциальность пользователей платформы «ЛВС — Лучшая Версия Себя» и
              бережно относимся к персональным данным.
            </p>
            <p>
              При регистрации через Telegram-бот мы получаем ваш Telegram ID и username. Эти данные
              используются только для авторизации и привязки аккаунта к личному кабинету.
            </p>
            <p>
              Записи дневника, данные трекера привычек и прогресс марафонов хранятся в зашифрованном
              виде и не передаются третьим лицам.
            </p>
            <p>
              Вы можете запросить удаление своих данных, обратившись в поддержку через бота
              @lvs_key_bot.
            </p>
            <p>
              Используя Сервис, вы соглашаетесь с обработкой ваших данных в целях предоставления
              доступа к функционалу платформы.
            </p>
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
