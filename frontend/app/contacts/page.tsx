import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Clock,
  FileText,
  Headphones,
  Mail,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { TelegramIcon } from '@/components/icons';

export const metadata = {
  title: 'Контакты и реквизиты',
};

const CONTACTS = [
  {
    icon: Headphones,
    label: 'Поддержка',
    value: 'hello@lvs.ru',
    href: 'mailto:hello@lvs.ru',
    hint: 'Ответим в течение рабочего дня',
  },
  {
    icon: MessageCircle,
    label: 'Telegram',
    value: '@lvs_key_bot',
    href: 'https://t.me/lvs_key_bot',
    hint: 'Поддержка и вход в аккаунт',
  },
  {
    icon: FileText,
    label: 'Документы',
    value: 'Оферта и политика',
    href: '/terms',
    hint: 'Публичные условия сервиса',
  },
];

export default function ContactsPage() {
  return (
    <main className="relative min-h-screen px-5 py-12 sm:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-neon/[0.05] blur-[120px]"
      />

      <div className="relative mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[12px] text-white/35 transition hover:text-white/70"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          На главную
        </Link>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-7 sm:p-9">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-neon/25 bg-neon/[0.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-neon/90">
                <BadgeCheck className="h-3 w-3" /> Официальный сервис
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-white/40">
                <Clock className="h-3 w-3" /> Пн–Пт · 10:00–19:00
              </span>
            </div>

            <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
              ЛВС
            </p>
            <h1 className="mt-4 font-display text-[30px] font-extrabold tracking-[-0.03em] text-white sm:text-[38px]">
              Контакты
            </h1>
            <p className="mt-4 max-w-[420px] text-[13.5px] leading-relaxed text-white/45">
              Поможем с доступом, оплатой, марафонами и документами. Напишите нам —
              отвечаем быстро и по делу.
            </p>

            <div className="mt-7 space-y-2.5">
              {CONTACTS.map((contact) => {
                const Icon = contact.icon;
                const inner = (
                  <>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.1] bg-gradient-to-b from-white/[0.09] to-white/[0.02] text-white/55 transition group-hover:text-[#C8FF7A]">
                      <Icon className="h-4 w-4" strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[9px] uppercase tracking-[0.14em] text-white/25">
                        {contact.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] font-medium text-white/80">
                        {contact.value}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] text-white/30">{contact.hint}</span>
                    </span>
                  </>
                );

                return contact.href.startsWith('http') ? (
                  <a
                    key={contact.label}
                    href={contact.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5 transition hover:border-white/[0.16] hover:bg-white/[0.04]"
                  >
                    {inner}
                  </a>
                ) : (
                  <Link
                    key={contact.label}
                    href={contact.href}
                    className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5 transition hover:border-white/[0.16] hover:bg-white/[0.04]"
                  >
                    {inner}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                Юридическая информация
              </p>
              <div className="mt-4 flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.1] bg-white/[0.03] text-white/45">
                  <Building2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[12.5px] font-medium text-white/80">
                    ЛВС · образовательная платформа
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/35">
                    Реквизиты, договор и закрывающие документы предоставляются по запросу
                    на hello@lvs.ru.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-white/[0.07] pt-4 text-[11px] text-white/35">
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#A8FF35]/60" /> Работаем в Казахстане и России
                </p>
                <p className="flex items-center gap-2">
                  <TelegramIcon className="h-3.5 w-3.5 text-white/25" /> Сообщество в Telegram
                </p>
              </div>
            </div>

            <div className="card p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                Документы
              </p>
              <div className="mt-4 space-y-2.5 text-[12px]">
                <Link href="/terms" className="flex items-center gap-2 text-white/55 transition hover:text-white">
                  <FileText className="h-3.5 w-3.5 text-white/25" /> Публичная оферта
                </Link>
                <Link href="/terms" className="flex items-center gap-2 text-white/55 transition hover:text-white">
                  <FileText className="h-3.5 w-3.5 text-white/25" /> Пользовательское соглашение
                </Link>
                <Link href="/privacy" className="flex items-center gap-2 text-white/55 transition hover:text-white">
                  <ShieldCheck className="h-3.5 w-3.5 text-white/25" /> Политика конфиденциальности
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
              <p className="flex items-center gap-2 text-[11px] text-white/40">
                <Mail className="h-3.5 w-3.5 text-white/25" />
                Для прессы и партнёрств: hello@lvs.ru
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
