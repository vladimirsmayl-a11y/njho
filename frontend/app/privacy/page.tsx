import { ArrowLeft, BadgeCheck, CalendarDays, Fingerprint, Lock, Mail } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Политика конфиденциальности',
};

const SECTIONS = [
  {
    title: '1. Какие данные мы собираем',
    body: 'При регистрации через Telegram-бот мы получаем ваш Telegram ID, username и имя профиля. Дополнительно вы можете указать email и пароль для входа по почте. В процессе использования Сервиса сохраняются записи дневника, данные трекеров привычек, прогресс марафонов и оценки дня.',
  },
  {
    title: '2. Зачем мы используем данные',
    body: 'Данные используются исключительно для авторизации, привязки аккаунта к личному кабинету, отображения прогресса и предоставления доступа к функционалу платформы. Мы не продаём и не передаём ваши данные третьим лицам в маркетинговых целях.',
  },
  {
    title: '3. Хранение и защита',
    body: 'Записи дневника, данные трекеров и прогресс марафонов хранятся в зашифрованном виде. Доступ к инфраструктуре ограничен, передача данных между клиентом и сервером защищена по протоколу TLS. Мы регулярно проверяем систему на уязвимости.',
  },
  {
    title: '4. Передача третьим лицам',
    body: 'Мы можем передавать обезличенные технические данные платёжным и инфраструктурным провайдерам только в объёме, необходимом для работы Сервиса. Такие провайдеры обязаны соблюдать конфиденциальность и не использовать данные в собственных целях.',
  },
  {
    title: '5. Ваши права',
    body: 'Вы можете запросить доступ к своим данным, их исправление или удаление, обратившись в поддержку через Telegram-бот @lvs_key_bot или по почте hello@lvs.ru. Мы обрабатываем запрос в течение 10 рабочих дней.',
  },
  {
    title: '6. Контакты',
    body: 'По вопросам обработки персональных данных: hello@lvs.ru. Используя Сервис, вы соглашаетесь с обработкой ваших данных в целях предоставления доступа к функционалу платформы.',
  },
];

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
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neon/25 bg-neon/[0.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-neon/90">
              <BadgeCheck className="h-3 w-3" /> Действует
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-white/40">
              <CalendarDays className="h-3 w-3" /> Редакция от 1 января 2026
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-white/40">
              <Lock className="h-3 w-3" /> TLS · шифрование
            </span>
          </div>

          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
            Документы
          </p>
          <h1 className="mt-4 font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-[34px]">
            Политика конфиденциальности
          </h1>
          <p className="mt-4 text-[12.5px] leading-relaxed text-white/35">
            Как мы собираем, используем и защищаем данные пользователей платформы
            «ЛВС — Лучшая Версия Себя».
          </p>

          <div className="mt-8 space-y-7">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="flex items-center gap-2 font-display text-[15px] font-bold tracking-[-0.01em] text-white/85">
                  <Fingerprint className="h-3.5 w-3.5 text-white/25" />
                  {section.title}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-white/50">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/25">
              Запрос по данным
            </p>
            <a
              href="mailto:hello@lvs.ru"
              className="mt-2 inline-flex items-center gap-2 text-[13px] text-white/65 transition hover:text-white"
            >
              <Mail className="h-3.5 w-3.5 text-white/30" />
              hello@lvs.ru
            </a>
            <p className="mt-2 text-[11px] leading-relaxed text-white/30">
              Или через поддержку в Telegram-боте @lvs_key_bot. Отвечаем в течение 10 рабочих дней.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-[11px] text-white/25 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} ЛВС. Все права защищены.</p>
            <div className="flex items-center gap-3">
              <Link href="/terms" className="transition hover:text-white/60">
                Публичная оферта
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
